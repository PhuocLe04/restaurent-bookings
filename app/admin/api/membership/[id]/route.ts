import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const cookieStore = await cookies()
  const userIdStr = cookieStore.get('web_user_id')?.value ?? null
  const userId = userIdStr ? Number(userIdStr) : NaN

  if (!Number.isFinite(userId) || userId <= 0) {
    return {
      ok: false as const,
      res: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    }
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  if (!me) {
    return {
      ok: false as const,
      res: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (me.role !== 'admin') {
    return {
      ok: false as const,
      res: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true as const, me }
}

function parseId(p: { id?: string | string[] }) {
  const raw = Array.isArray(p.id) ? p.id[0] : p.id
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : null
}

// GET /admin/api/membership/[id]
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const p = await ctx.params
  const id = parseId(p)
  if (!id)
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })

  const data = await prisma.membership.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      min_point: true,
      discount_percent: true,
      created_at: true,
      _count: { select: { users: true } },
    },
  })

  if (!data) {
    return NextResponse.json(
      { message: 'Không tìm thấy membership' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    id: data.id,
    code: data.code,
    name: data.name,
    min_point: data.min_point,
    discount_percent: data.discount_percent,
    created_at: data.created_at,
    usersCount: data._count.users,
  })
}

// PATCH /admin/api/membership/[id]
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const p = await ctx.params
  const id = parseId(p)
  if (!id)
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body)
    return NextResponse.json({ message: 'Body không hợp lệ' }, { status: 400 })

  const data: any = {}

  if (body.code !== undefined) {
    const code = String(body.code ?? '').trim()
    if (!code)
      return NextResponse.json(
        { message: 'Code không được rỗng' },
        { status: 400 },
      )

    const existed = await prisma.membership.findUnique({ where: { code } })
    if (existed && existed.id !== id) {
      return NextResponse.json({ message: 'Code đã tồn tại' }, { status: 409 })
    }
    data.code = code
  }

  if (body.name !== undefined) {
    const name = String(body.name ?? '').trim()
    if (!name)
      return NextResponse.json(
        { message: 'Tên hạng không được rỗng' },
        { status: 400 },
      )
    data.name = name
  }

  if (body.min_point !== undefined) {
    const min_point = Number(body.min_point)
    if (!Number.isFinite(min_point) || min_point < 0) {
      return NextResponse.json(
        { message: 'min_point không hợp lệ' },
        { status: 400 },
      )
    }
    data.min_point = min_point
  }

  if (body.discount_percent !== undefined) {
    const discount_percent = Number(body.discount_percent)
    if (
      !Number.isFinite(discount_percent) ||
      discount_percent < 0 ||
      discount_percent > 100
    ) {
      return NextResponse.json(
        { message: 'discount_percent phải từ 0–100' },
        { status: 400 },
      )
    }
    data.discount_percent = Math.floor(discount_percent)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: 'Không có dữ liệu để cập nhật' },
      { status: 400 },
    )
  }

  const updated = await prisma.membership.update({
    where: { id },
    data,
    select: {
      id: true,
      code: true,
      name: true,
      min_point: true,
      discount_percent: true,
      created_at: true,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /admin/api/membership/[id]
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const p = await ctx.params
  const id = parseId(p)
  if (!id)
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })

  if (id === 1) {
    return NextResponse.json(
      { message: 'Không thể xóa membership mặc định (ID=1)' },
      { status: 400 },
    )
  }

  const usedCount = await prisma.user.count({ where: { membership_id: id } })
  if (usedCount > 0) {
    return NextResponse.json(
      {
        message: `Không thể xóa. Có ${usedCount} người dùng đang thuộc hạng này.`,
      },
      { status: 400 },
    )
  }

  await prisma.membership.delete({ where: { id } })
  return NextResponse.json({ message: 'Xóa membership thành công' })
}
