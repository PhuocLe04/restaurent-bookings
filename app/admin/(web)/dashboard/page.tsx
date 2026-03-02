// app/admin/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const userIdRaw = cookieStore.get('web_user_id')?.value

  if (!userIdRaw) redirect('/login')

  const userId = Number(userIdRaw)
  if (!userId) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, full_name: true, role: true },
  })

  // Không tồn tại user / cookie giả
  if (!user) redirect('/login')

  // Chặn nếu không phải admin
  if (user.role !== 'admin') redirect('/403') // hoặc redirect('/')

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Admin Dashboard</h1>
      <p>
        Xin chào, {user.full_name} (#{user.id})
      </p>

      <section style={{ marginTop: 16 }}>
        <ul>
          <li>Quản lý đặt bàn</li>
          <li>Quản lý bàn / loại bàn</li>
          <li>Quản lý menu / combo / services</li>
          <li>Quản lý nhân viên & ca làm</li>
          <li>Audit logs</li>
        </ul>
      </section>
    </main>
  )
}
