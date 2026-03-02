import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Reservation from './components/index'

function getExpireMs(raw: string | undefined) {
  if (!raw) return 0
  // web_auth_expire đang URL-encoded: 2026-03-04T12%3A59%3A11.260Z
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

  // 🚫 chưa login / hết hạn
  if (!token || !userId || !expireMs || expireMs <= Date.now()) {
    redirect('/login?redirect=/reservations')
  }

  // ✅ lấy user thật trong DB (đảm bảo user_id cookie còn hợp lệ)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, full_name: true, role: true },
  })

  if (!user) {
    redirect('/login?redirect=/reservations')
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Đặt bàn</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Xin chào <b>{user.full_name}</b>
      </p>

      <div className="mt-6">
        <Reservation userId={user.id} />
      </div>
    </div>
  )
}
