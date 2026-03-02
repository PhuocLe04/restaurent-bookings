import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseId(idRaw: string) {
  const id = Number(idRaw)
  return Number.isFinite(id) && id > 0 ? Math.floor(id) : null
}

async function requireAdmin() {
  const cookieStore = await cookies() // ✅ Next mới: phải await
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

// ✅ Next mới: params là Promise
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const { id: idRaw } = await ctx.params
  const id = parseId(idRaw)
  if (!id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      full_name: true,
      avatar: true,
      email: true,
      phone: true,
      role: true,
      member_point: true,
      membership_id: true,
      created_at: true,
      membership: {
        select: {
          id: true,
          name: true,
          code: true,
          discount_percent: true,
        },
      },
    },
  })

  if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const { id: idRaw } = await ctx.params
  const id = parseId(idRaw)
  if (!id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body)
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })

  const data: any = {}
  if (body.full_name !== undefined)
    data.full_name = String(body.full_name ?? '').trim()
  if (body.avatar !== undefined)
    data.avatar = body.avatar == null ? null : String(body.avatar).trim()
  if (body.email !== undefined) data.email = String(body.email ?? '').trim()
  if (body.phone !== undefined) data.phone = String(body.phone ?? '').trim()

  if (body.role !== undefined) {
    const role = String(body.role ?? '').trim()
    if (!['admin', 'customer'].includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 })
    }
    data.role = role
  }

  if (body.membership_id !== undefined) {
    const membership_id = Number(body.membership_id)
    if (!Number.isFinite(membership_id) || membership_id <= 0) {
      return NextResponse.json(
        { message: 'Invalid membership_id' },
        { status: 400 },
      )
    }
    data.membership_id = membership_id
  }

  if (body.member_point !== undefined) data.member_point = body.member_point
  if (body.password_hash !== undefined)
    data.password_hash = String(body.password_hash ?? '').trim()

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { message: 'No fields to update' },
      { status: 400 },
    )
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        full_name: true,
        avatar: true,
        email: true,
        phone: true,
        role: true,
        member_point: true,
        membership_id: true,
        created_at: true,
      },
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Update user failed', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const { id: idRaw } = await ctx.params
  const id = parseId(idRaw)
  if (!id) return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Delete user failed', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
