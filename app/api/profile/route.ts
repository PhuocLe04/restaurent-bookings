import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// Lấy userId từ cookie
async function parseUserIdFromCookies(): Promise<number | null> {
  const c = await cookies()
  const raw = c.get('web_user_id')?.value ?? c.get('user_id')?.value
  if (!raw) return null

  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

// ========================
// GET /api/profile
// ========================
export async function GET() {
  try {
    const userId = await parseUserIdFromCookies()

    if (!userId) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 },
      )
    }

    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json(
      {
        message: 'Lỗi máy chủ',
        error: e?.message ?? String(e),
      },
      { status: 500 },
    )
  }
}

// ========================
// PATCH /api/profile
// ========================
export async function PATCH(req: Request) {
  try {
    const userId = await parseUserIdFromCookies()

    if (!userId) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    }

    const body = (await req.json()) as {
      full_name?: string
      avatar?: string | null
      phone?: string
      email?: string
      current_password?: string
      new_password?: string
    }

    const data: any = {}

    // cập nhật tên
    if (typeof body.full_name === 'string') {
      const v = body.full_name.trim()

      if (!v) {
        return NextResponse.json(
          { message: 'Họ và tên không được để trống' },
          { status: 400 },
        )
      }

      if (v.length > 100) {
        return NextResponse.json(
          { message: 'Họ và tên quá dài' },
          { status: 400 },
        )
      }

      data.full_name = v
    }

    // cập nhật avatar
    if (body.avatar === null || typeof body.avatar === 'string') {
      const v = typeof body.avatar === 'string' ? body.avatar.trim() : null

      if (typeof v === 'string' && v.length > 500) {
        return NextResponse.json(
          { message: 'Đường dẫn ảnh quá dài' },
          { status: 400 },
        )
      }

      data.avatar = v
    }

    // cập nhật phone
    if (typeof body.phone === 'string') {
      const v = body.phone.trim()

      if (!v) {
        return NextResponse.json(
          { message: 'Số điện thoại không được để trống' },
          { status: 400 },
        )
      }

      if (v.length > 15) {
        return NextResponse.json(
          { message: 'Số điện thoại quá dài' },
          { status: 400 },
        )
      }

      data.phone = v
    }

    // cập nhật email
    if (typeof body.email === 'string') {
      const v = body.email.trim()

      if (!v) {
        return NextResponse.json(
          { message: 'Email không được để trống' },
          { status: 400 },
        )
      }

      if (v.length > 100) {
        return NextResponse.json({ message: 'Email quá dài' }, { status: 400 })
      }

      data.email = v
    }

    // đổi mật khẩu
    const wantsChangePw = body.current_password && body.new_password

    if (wantsChangePw) {
      const current = String(body.current_password)
      const next = String(body.new_password)

      if (next.length < 6) {
        return NextResponse.json(
          { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' },
          { status: 400 },
        )
      }

      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { password_hash: true },
      })

      if (!u) {
        return NextResponse.json(
          { message: 'Không tìm thấy người dùng' },
          { status: 404 },
        )
      }

      const ok = await bcrypt.compare(current, u.password_hash)

      if (!ok) {
        return NextResponse.json(
          { message: 'Mật khẩu hiện tại không đúng' },
          { status: 400 },
        )
      }

      data.password_hash = await bcrypt.hash(next, 10)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Không có dữ liệu cần cập nhật' },
        { status: 400 },
      )
    }

    const updated = await prisma.user.update({
      where: { id: userId },
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

    return NextResponse.json({
      message: 'Cập nhật thông tin thành công',
      user: updated,
    })
  } catch (e: any) {
    const msg = e?.message ?? String(e)

    return NextResponse.json(
      {
        message: 'Lỗi máy chủ',
        error: msg,
      },
      { status: 500 },
    )
  }
}
