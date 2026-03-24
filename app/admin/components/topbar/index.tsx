'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, ChevronRight, LogOut, Home } from 'lucide-react'
import 'animate.css'
import './index.css'

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
}

const pageNames: Record<string, string> = {
  '/admin': 'Quản trị',
  '/admin/dashboard': 'Dashboard',
  '/admin/analytics': 'Phân tích',

  '/admin/reservations': 'Đặt bàn',
  '/admin/checkin': 'Check-in',
  '/admin/order': 'Đơn hàng',
  '/admin/order-items': 'Chi tiết đơn hàng',
  '/admin/payment': 'Thanh toán',

  '/admin/menu-items': 'Món ăn',
  '/admin/categories': 'Danh mục',
  '/admin/combo': 'Combo',
  '/admin/combo-menu-items': 'Món trong Combo',
  '/admin/reservation-services': 'Dịch vụ',
  '/admin/combo-services': 'Dịch vụ trong Combo',

  '/admin/restaurant-table': 'Bàn ăn',
  '/admin/table-type': 'Loại bàn',
  '/admin/reservation-table': 'Bàn đã đặt',

  '/admin/staff': 'Nhân viên',
  '/admin/shifts': 'Ca làm việc',

  '/admin/user': 'Người dùng',
  '/admin/membership': 'Hạng thành viên',

  '/admin/blogs': 'Bài viết',
  '/admin/audit-log': 'Lịch sử hoạt động',
}

function resolvePageName(pathname: string) {
  if (!pathname) return 'Quản trị'

  if (pageNames[pathname]) return pageNames[pathname]

  const found = Object.entries(pageNames)
    .filter(([key]) => key !== '/admin')
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => pathname.startsWith(key))

  return found?.[1] ?? 'Quản trị'
}

type ProfileResponse = {
  id: number
  full_name: string
  email: string
  role: string
  staff: null | {
    full_name: string
    role: string
  }
}

function initials(name: string) {
  const s = name.trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (a + b).toUpperCase() || s[0]!.toUpperCase()
}

export default function AdminTopbar({ collapsed, onToggle }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const currentPage = useMemo(() => resolvePageName(pathname), [pathname])
  const sidebarWidth = collapsed ? '72px' : '260px'

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/profile', { cache: 'no-store' })
        if (!alive) return

        if (!res.ok) {
          setProfile(null)
          return
        }

        const data = await res.json()
        setProfile(data)
      } catch {
        setProfile(null)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [])

  const displayName = profile?.full_name || profile?.staff?.full_name || 'Admin'
  const displayRole = profile?.staff?.role || profile?.role || 'ADMIN'
  const avatarText = initials(displayName)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const handleBack = () => {
    router.push('/#hero')
  }

  return (
    <motion.header
      className="admin-topbar animate__animated animate__fadeInDown"
      style={{ left: sidebarWidth }}
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="topbar-left">
        <motion.button
          className="topbar-toggle"
          onClick={onToggle}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
        >
          <Menu size={20} />
        </motion.button>

        <motion.div
          className="topbar-breadcrumb"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link href="/admin" className="breadcrumb-home">
            <Home size={16} />
            <span>Quản trị</span>
          </Link>

          <ChevronRight size={14} className="breadcrumb-sep" />

          <motion.span
            key={currentPage}
            className="breadcrumb-current animate__animated animate__fadeIn"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentPage}
          </motion.span>
        </motion.div>
      </div>

      <div className="topbar-right">
        <motion.button
          type="button"
          className="topbar-back-btn"
          onClick={handleBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span className="btn-content" whileHover={{ x: -3 }}>
            <LogOut size={16} />
            <span>Quay lại trang chủ</span>
          </motion.span>
        </motion.button>

        <div className="topbar-divider" />

        <div className="topbar-user">
          <motion.div
            className="user-avatar animate__animated animate__zoomIn"
            whileHover={{
              scale: 1.1,
              rotate: 5,
            }}
            whileTap={{ scale: 0.9 }}
          >
            {loading ? '…' : avatarText}
          </motion.div>

          <div className="user-info">
            <motion.div
              className="user-name"
              key={displayName}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {loading ? 'Loading...' : displayName}
            </motion.div>

            <div className="user-role">{displayRole}</div>
          </div>

          <motion.button
            className="user-logout"
            onClick={handleLogout}
            whileHover={{
              scale: 1.1,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
            }}
            whileTap={{ scale: 0.9 }}
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}
