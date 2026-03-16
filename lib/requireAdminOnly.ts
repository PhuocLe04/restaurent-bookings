import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

type AdminAuthSuccess = {
  ok: true
  userId: number
  isAdmin: true
  isStaff: false
}

type AdminAuthFailure = {
  ok: false
  res: NextResponse
}

export type RequireAdminOnlyResult = AdminAuthSuccess | AdminAuthFailure

async function parseUserIdFromCookies(): Promise<number | null> {
  const cookieStore = await cookies()

  const raw =
    cookieStore.get('web_user_id')?.value ?? cookieStore.get('user_id')?.value

  if (!raw) return null

  const userId = Number(raw)
  if (!Number.isFinite(userId) || userId <= 0) return null

  return userId
}

export async function requireAdminOnly(): Promise<RequireAdminOnlyResult> {
  try {
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

    if (user.role !== 'admin') {
      return {
        ok: false,
        res: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
      }
    }

    return {
      ok: true,
      userId: user.id,
      isAdmin: true,
      isStaff: false,
    }
  } catch (error) {
    console.error('requireAdminOnly error:', error)

    return {
      ok: false,
      res: NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 },
      ),
    }
  }
}
