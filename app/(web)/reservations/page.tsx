import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReservationClient from './components/index'
import './page.css'

function getExpireMs(raw: string | undefined) {
  if (!raw) return 0
  const decoded = decodeURIComponent(raw)
  const d = new Date(decoded)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

export default async function ReservationsPage() {
  const cookieStore = await cookies()

  const token = cookieStore.get('web_auth_token')?.value
  const rawExpire = cookieStore.get('web_auth_expire')?.value
  const userId = Number(cookieStore.get('web_user_id')?.value ?? 0)

  const expireMs = getExpireMs(rawExpire)

  if (!token || !userId || !expireMs || expireMs <= Date.now()) {
    redirect('/login?redirect=/reservations')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, full_name: true, role: true },
  })

  if (!user) {
    redirect('/login?redirect=/reservations')
  }

  return <ReservationClient userId={user.id} userName={user.full_name} />
}
