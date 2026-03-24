import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

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
  const auth = await requireAdminOnly()
  if (!auth.ok) return auth.res

  try {
    const p = await ctx.params
    const id = parseId(p)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

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
        { message: 'Không tìm thấy hạng thành viên' },
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
  } catch (error) {
    console.error('Lỗi GET /admin/api/membership/[id]:', error)
    return NextResponse.json({ message: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

// PATCH /admin/api/membership/[id]
// Cập nhật hạng thành viên + ghi audit log
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> },
) {
  const auth = await requireAdminOnly()
  if (!auth.ok) return auth.res

  try {
    const p = await ctx.params
    const id = parseId(p)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ' },
        { status: 400 },
      )
    }

    const current = await prisma.membership.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        min_point: true,
        discount_percent: true,
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy hạng thành viên' },
        { status: 404 },
      )
    }

    const data: {
      code?: string
      name?: string
      min_point?: number
      discount_percent?: number
    } = {}

    if (body.code !== undefined) {
      const code = String(body.code ?? '').trim()

      if (!code) {
        return NextResponse.json(
          { message: 'Mã hạng không được để trống' },
          { status: 400 },
        )
      }

      const existed = await prisma.membership.findUnique({
        where: { code },
        select: { id: true },
      })

      if (existed && existed.id !== id) {
        return NextResponse.json(
          { message: 'Mã hạng đã tồn tại' },
          { status: 409 },
        )
      }

      data.code = code
    }

    if (body.name !== undefined) {
      const name = String(body.name ?? '').trim()

      if (!name) {
        return NextResponse.json(
          { message: 'Tên hạng không được để trống' },
          { status: 400 },
        )
      }

      data.name = name
    }

    if (body.min_point !== undefined) {
      const min_point = Number(body.min_point)

      if (!Number.isFinite(min_point) || min_point < 0) {
        return NextResponse.json(
          { message: 'Điểm tối thiểu không hợp lệ' },
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
          { message: 'Phần trăm giảm phải nằm trong khoảng từ 0 đến 100' },
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

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.membership.update({
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

      const changes: string[] = []
      const currentMinPoint = Number(current.min_point)
      const currentDiscountPercent = Number(current.discount_percent)

      if (data.code !== undefined && data.code !== current.code) {
        changes.push(`mã hạng: "${current.code}" → "${data.code}"`)
      }

      if (data.name !== undefined && data.name !== current.name) {
        changes.push(`tên hạng: "${current.name}" → "${data.name}"`)
      }

      if (data.min_point !== undefined && data.min_point !== currentMinPoint) {
        changes.push(`điểm tối thiểu: ${currentMinPoint} → ${data.min_point}`)
      }

      if (
        data.discount_percent !== undefined &&
        data.discount_percent !== currentDiscountPercent
      ) {
        changes.push(
          `phần trăm giảm: ${currentDiscountPercent}% → ${data.discount_percent}%`,
        )
      }

      await tx.audit_logs.create({
        data: {
          entity: 'membership',
          entity_id: item.id,
          action: 'UPDATE',
          description:
            changes.length > 0
              ? `Cập nhật hạng thành viên ${item.name} (${item.code}): ${changes.join(', ')}`
              : `Cập nhật hạng thành viên ${item.name} (${item.code})`,
          user_id: auth.userId,
        },
      })

      return item
    })

    return NextResponse.json({
      message: 'Cập nhật hạng thành viên thành công',
      data: updated,
    })
  } catch (error) {
    console.error('Lỗi PATCH /admin/api/membership/[id]:', error)
    return NextResponse.json({ message: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> },
) {
  const auth = await requireAdminOnly()
  if (!auth.ok) return auth.res

  try {
    const p = await ctx.params
    const id = parseId(p)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    if (id === 1) {
      return NextResponse.json(
        { message: 'Không thể xóa hạng thành viên mặc định (ID = 1)' },
        { status: 400 },
      )
    }

    const membership = await prisma.membership.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { message: 'Không tìm thấy hạng thành viên' },
        { status: 404 },
      )
    }

    const usedCount = await prisma.user.count({
      where: { membership_id: id },
    })

    if (usedCount > 0) {
      return NextResponse.json(
        {
          message: `Không thể xóa. Có ${usedCount} người dùng đang thuộc hạng này.`,
        },
        { status: 400 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: { id },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'membership',
          entity_id: membership.id,
          action: 'DELETE',
          description: `Xóa hạng thành viên: ${membership.name} (${membership.code})`,
          user_id: auth.userId,
        },
      })
    })

    return NextResponse.json({
      message: 'Xóa hạng thành viên thành công',
    })
  } catch (error) {
    console.error('Lỗi DELETE /admin/api/membership/[id]:', error)
    return NextResponse.json({ message: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
