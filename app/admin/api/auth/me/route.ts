import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaff } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const access = await requireAdminOrStaff()
  if (!access.ok) return access.res

  try {
    const user = await prisma.user.findUnique({
      where: { id: access.userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 },
      )
    }

    let staff: {
      id: number
      full_name: string
      is_active: boolean | null
    } | null = null

    if (access.isStaff) {
      const staffProfile = await prisma.staff.findFirst({
        where: {
          user_id: user.id,
        },
        select: {
          id: true,
          full_name: true,
          is_active: true,
        },
      })

      if (!staffProfile) {
        return NextResponse.json(
          {
            message: 'Tài khoản staff chưa được liên kết với hồ sơ nhân viên',
          },
          { status: 404 },
        )
      }

      staff = staffProfile
    }

    return NextResponse.json({
      message: 'Lấy thông tin người dùng thành công',
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
      user,
      staff,
    })
  } catch (error: any) {
    console.error('GET /admin/api/auth/me error:', error)

    return NextResponse.json(
      {
        message: 'Không thể lấy thông tin người dùng',
        detail: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
