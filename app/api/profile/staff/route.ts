import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Đang dùng cookie web_user_id như bạn nói trước đó
  const userIdRaw = (await cookies()).get('web_user_id')?.value
  const userId = userIdRaw ? Number(userIdRaw) : null

  if (!userId) return NextResponse.json({ profile: null }, { status: 200 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
      phone: true,
      avatar: true,
    },
  })

  if (!user) return NextResponse.json({ profile: null }, { status: 200 })

  const staff = await prisma.staff.findFirst({
    where: { user_id: userId },
    select: { id: true },
  })

  return NextResponse.json(
    {
      profile: {
        id: String(user.id),
        full_name: user.full_name,
        email: user.email,
        phone: user.phone ?? null,
        avatar: user.avatar ?? null,
        role: user.role,
        is_staff: !!staff,
        staff_id: staff?.id ?? null,
      },
    },
    { status: 200 },
  )
}
