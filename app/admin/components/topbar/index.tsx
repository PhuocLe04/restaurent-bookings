'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Menu,
  ChevronRight,
  LogOut,
  Home,
  Bell,
  Search,
  User,
} from 'lucide-react'
import './index.css'

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
}

const pageNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/reservations': 'Reservations',
  '/admin/orders': 'Orders',
  '/admin/menu': 'Menu Items',
  '/admin/customers': 'Customers',
  '/admin/staff': 'Chefs & Staff',
  '/admin/gallery': 'Gallery',
  '/admin/messages': 'Messages',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
}

// match nested route: /admin/orders/123 -> Orders
function resolvePageName(pathname: string) {
  if (pageNames[pathname]) return pageNames[pathname]
  const found = Object.entries(pageNames)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([k]) => k !== '/admin' && pathname.startsWith(k))
  return found?.[1] ?? 'Admin'
}

type ProfileResponse = {
  id: number
  full_name: string
  email: string
  phone: string
  role: string
  member_point: any
  membership_id: number | null
  created_at: string | null
  staff: null | {
    id: number
    full_name: string
    role: string
    phone: string
    is_active: boolean
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

        if (res.status === 401) {
          setProfile(null)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setProfile(null)
          setLoading(false)
          return
        }

        const data = (await res.json()) as ProfileResponse
        setProfile(data)
      } catch {
        if (!alive) return
        setProfile(null)
      } finally {
        if (!alive) return
        setLoading(false)
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
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/admin/login')
      router.refresh()
    }
  }

  return (
    <motion.header
      className="admin-topbar"
      style={{ left: sidebarWidth }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="topbar-left">
        <motion.button
          className="topbar-toggle"
          onClick={onToggle}
          aria-label="Toggle sidebar"
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu size={20} />
        </motion.button>

        <motion.div
          className="topbar-breadcrumb"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href="/admin" className="breadcrumb-home">
            <Home size={16} />
            <span>Admin</span>
          </Link>
          <ChevronRight size={14} className="breadcrumb-sep" />
          <motion.span
            className="breadcrumb-current"
            key={currentPage}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentPage}
          </motion.span>
        </motion.div>
      </div>

      <div className="topbar-right">
        {/* Back to Site Button */}
        <Link
          href="/"
          className="topbar-back-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <motion.span
            className="btn-content"
            whileHover={{ x: -2 }}
            transition={{ duration: 0.2 }}
          >
            <LogOut size={16} />
            <span>Back to Site</span>
          </motion.span>
        </Link>

        <div className="topbar-divider" />

        {/* User Menu */}
        <div className="topbar-user">
          <motion.div
            className="user-avatar"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={displayName}
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
            type="button"
            className="user-logout"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            whileHover={{
              scale: 1.05,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </div>
    </motion.header>
  )
}
