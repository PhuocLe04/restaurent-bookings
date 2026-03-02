import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

async function parseUserIdFromCookies(): Promise<number | null> {
  const c = cookies()
  // bạn đang từng dùng "web_user_id" + "user_id" nên check cả 2
  const raw =
    (await c).get('web_user_id')?.value ?? (await c).get('user_id')?.value
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

// ✅ GET /api/profile
export async function GET() {
  try {
    const userId = await parseUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        member_point: true,
        membership_id: true,
        created_at: true,
        membership: {
          select: {
            id: true,
            code: true,
            name: true,
            min_point: true,
            discount_percent: true,
          },
        },
        staff: {
          select: {
            id: true,
            full_name: true,
            role: true,
            phone: true,
            is_active: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}

// ✅ PATCH /api/profile
export async function PATCH(req: Request) {
  try {
    const userId = await parseUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }

    const body = (await req.json()) as {
      full_name?: string
      avatar?: string | null
      phone?: string

      // optional đổi mật khẩu
      current_password?: string
      new_password?: string
    }

    const data: any = {}

    if (typeof body.full_name === 'string') {
      const v = body.full_name.trim()
      if (!v)
        return NextResponse.json(
          { message: 'full_name is required' },
          { status: 400 },
        )
      if (v.length > 100)
        return NextResponse.json(
          { message: 'full_name too long' },
          { status: 400 },
        )
      data.full_name = v
    }

    if (body.avatar === null || typeof body.avatar === 'string') {
      // avatar nullable
      if (typeof body.avatar === 'string' && body.avatar.length > 500) {
        return NextResponse.json(
          { message: 'avatar too long' },
          { status: 400 },
        )
      }
      data.avatar = body.avatar
    }

    if (typeof body.phone === 'string') {
      const v = body.phone.trim()
      if (!v)
        return NextResponse.json(
          { message: 'phone is required' },
          { status: 400 },
        )
      if (v.length > 15)
        return NextResponse.json({ message: 'phone too long' }, { status: 400 })
      data.phone = v
    }

    // đổi password (optional)
    const wantsChangePw = body.current_password && body.new_password
    if (wantsChangePw) {
      const current = String(body.current_password)
      const next = String(body.new_password)

      if (next.length < 6) {
        return NextResponse.json(
          { message: 'new_password must be at least 6 chars' },
          { status: 400 },
        )
      }

      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { password_hash: true },
      })
      if (!u)
        return NextResponse.json({ message: 'User not found' }, { status: 404 })

      const ok = await bcrypt.compare(current, u.password_hash)
      if (!ok) {
        return NextResponse.json(
          { message: 'Current password is incorrect' },
          { status: 400 },
        )
      }

      data.password_hash = await bcrypt.hash(next, 10)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Nothing to update' },
        { status: 400 },
      )
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        member_point: true,
        membership_id: true,
        created_at: true,
      },
    })

    return NextResponse.json({ message: 'Updated', user: updated })
  } catch (e: any) {
    // phone/email unique có thể dính lỗi prisma
    const msg = e?.message ?? String(e)
    return NextResponse.json(
      { message: 'Server error', error: msg },
      { status: 500 },
    )
  }
}
