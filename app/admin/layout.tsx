import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminShell from './AdminShell'

export const dynamic = 'force-dynamic'

async function parseUserIdFromCookies(): Promise<number | null> {
  const cookieStore = await cookies()

  const raw =
    cookieStore.get('web_user_id')?.value ?? cookieStore.get('user_id')?.value

  if (!raw) return null

  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const userId = await parseUserIdFromCookies()

  if (!userId) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  if (user.role === 'admin') {
    return <AdminShell>{children}</AdminShell>
  }

  const staff = await prisma.staff.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      is_active: true,
    },
  })

  if (!staff || staff.is_active !== true) {
    redirect('/')
  }

  return <AdminShell>{children}</AdminShell>
}
