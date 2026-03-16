// app/admin/layout.tsx  (SERVER - KHÔNG "use client")
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminShell from './AdminShell' // client wrapper

export const dynamic = 'force-dynamic'

async function parseUserIdFromCookies(): Promise<number | null> {
  const c = cookies()
  const raw =
    (await c).get('web_user_id')?.value ?? (await c).get('user_id')?.value
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
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) redirect('/login')
  if (user.role !== 'admin') redirect('/')

  return <AdminShell>{children}</AdminShell>
}
