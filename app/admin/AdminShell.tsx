'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

import AdminSidebar from './components/sidebar'
import AdminTopbar from './components/topbar'
import './global.css'

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
    setMounted(true)
  }, [])

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('admin-sidebar-collapsed', String(next))
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="admin-root">
        <AdminSidebar collapsed={false} />
        <AdminTopbar collapsed={false} onToggle={handleToggle} />

        <main className="admin-content">
          <div className="admin-page">{children}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-root">
      <AdminSidebar collapsed={collapsed} />
      <AdminTopbar collapsed={collapsed} onToggle={handleToggle} />

      <main className={`admin-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="admin-page">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
