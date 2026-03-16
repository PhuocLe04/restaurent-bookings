import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

async function parseUserIdFromCookies(): Promise<number | null> {
  const cookieStore = await cookies()

  const raw =
    cookieStore.get('web_user_id')?.value ?? cookieStore.get('user_id')?.value

  if (!raw) return null

  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export type AdminAccessResult =
  | {
      ok: true
      userId: number
      isAdmin: boolean
      isStaff: boolean
    }
  | {
      ok: false
      res: NextResponse
    }

export async function requireAdminOrStaff(): Promise<AdminAccessResult> {
  const userId = await parseUserIdFromCookies()

  if (!userId) {
    return {
      ok: false,
      res: NextResponse.json({ message: 'Unauthenticated' }, { status: 401 }),
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  })

  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ message: 'Unauthenticated' }, { status: 401 }),
    }
  }

  if (user.role === 'admin') {
    return {
      ok: true,
      userId,
      isAdmin: true,
      isStaff: false,
    }
  }

  const staff = await prisma.staff.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      is_active: true,
    },
  })

  if (!staff || staff.is_active !== true) {
    return {
      ok: false,
      res: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    ok: true,
    userId,
    isAdmin: false,
    isStaff: true,
  }
}
