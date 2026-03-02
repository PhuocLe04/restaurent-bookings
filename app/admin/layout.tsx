'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

import AdminSidebar from './components/sidebar'
import AdminTopbar from './components/topbar'
import './global.css'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Desktop only - no mobile state
  useEffect(() => {
    // Load collapsed state from localStorage if needed
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved) {
      setCollapsed(saved === 'true')
    }
  }, [])

  const handleToggle = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('admin-sidebar-collapsed', String(newState))
  }

  return (
    <div className="admin-root">
      {/* Sidebar - fixed */}
      <AdminSidebar
        collapsed={collapsed}
      />

      {/* Topbar - fixed */}
      <AdminTopbar collapsed={collapsed} onToggle={handleToggle} />

      {/* Main Content - scrollable */}
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
