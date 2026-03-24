'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, easeOut } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  CalendarCheck,
  UtensilsCrossed,
  Users,
  PieChart,
  ShoppingBag,
  CreditCard,
  Clock,
  Table,
  Grid,
  FileText,
  Gift,
  Briefcase,
  Database,
  UserCheck,
  CombineIcon,
  UserCircle,
} from 'lucide-react'
import 'animate.css'
import './index.css'

interface SidebarProps {
  collapsed: boolean
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  exact?: boolean
  badge?: string
  adminOnly?: boolean
  allowStaff?: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

type MeResponse = {
  message?: string
  access?: {
    userId: number
    isAdmin: boolean
    isStaff: boolean
  }
  user?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  }
  staff?: {
    id: number
    full_name: string
    is_active: boolean | null
  } | null
}

const navSections: NavSection[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        href: '/admin/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        exact: true,
        adminOnly: true,
      },
      {
        href: '/admin/analytics',
        label: 'Phân tích',
        icon: PieChart,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Đặt bàn & Order',
    items: [
      {
        href: '/admin/reservations',
        label: 'Đặt bàn',
        icon: CalendarCheck,
        allowStaff: true,
      },
      {
        href: '/admin/checkin',
        label: 'Check-in',
        icon: UserCheck,
        allowStaff: true,
      },
      {
        href: '/admin/order',
        label: 'Đơn hàng',
        icon: ShoppingBag,
        allowStaff: true,
      },
      {
        href: '/admin/payment',
        label: 'Thanh toán',
        icon: CreditCard,
        allowStaff: true,
      },
    ],
  },
  {
    label: 'Quản lý thực đơn',
    items: [
      {
        href: '/admin/menu-items',
        label: 'Món ăn',
        icon: UtensilsCrossed,
        adminOnly: true,
      },
      {
        href: '/admin/categories',
        label: 'Danh mục',
        icon: Grid,
        adminOnly: true,
      },
      {
        href: '/admin/combo',
        label: 'Combo',
        icon: CombineIcon,
        adminOnly: true,
      },
      {
        href: '/admin/reservation-services',
        label: 'Dịch vụ',
        icon: Gift,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Quản lý bàn',
    items: [
      {
        href: '/admin/restaurant-table',
        label: 'Bàn ăn',
        icon: Table,
        adminOnly: true,
      },
      {
        href: '/admin/table-type',
        label: 'Loại bàn',
        icon: Grid,
        adminOnly: true,
      },
      {
        href: '/admin/reservation-table',
        label: 'Bàn đã đặt',
        icon: CalendarCheck,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Nhân sự',
    items: [
      {
        href: '/admin/staff',
        label: 'Nhân viên',
        icon: Briefcase,
        adminOnly: true,
      },
      {
        href: '/admin/shifts',
        label: 'Ca làm việc',
        icon: Clock,
        allowStaff: true,
      },
    ],
  },
  {
    label: 'Khách hàng',
    items: [
      {
        href: '/admin/user',
        label: 'Người dùng',
        icon: Users,
        adminOnly: true,
      },
      {
        href: '/admin/membership',
        label: 'Hạng thành viên',
        icon: UserCircle,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      {
        href: '/admin/blogs',
        label: 'Bài viết',
        icon: FileText,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      {
        href: '/admin/audit-log',
        label: 'Lịch sử hoạt động',
        icon: Database,
        adminOnly: true,
      },
    ],
  },
]

const sidebarVariants = {
  hidden: { opacity: 0, x: -18 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: easeOut,
      when: 'beforeChildren',
      staggerChildren: 0.04,
    },
  },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: easeOut,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.22,
      ease: easeOut,
    },
  },
}

export default function AdminSidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname()

  const [me, setMe] = useState<MeResponse | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchMe() {
      try {
        setLoadingMe(true)

        const res = await fetch('/admin/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)

        if (!mounted) return

        if (!res.ok) {
          setMe(null)
          return
        }

        setMe(data)
      } catch (error) {
        console.error('Fetch /admin/api/auth/me failed:', error)
        if (mounted) setMe(null)
      } finally {
        if (mounted) setLoadingMe(false)
      }
    }

    fetchMe()

    return () => {
      mounted = false
    }
  }, [])

  const isAdmin = !!me?.access?.isAdmin
  const isStaff = !!me?.access?.isStaff

  const filteredSections = useMemo(() => {
    if (loadingMe) return []

    const sections = navSections
      .map((section) => {
        const items = section.items.filter((item) => {
          if (isAdmin) return true

          if (item.allowStaff && isStaff) return true

          return false
        })

        return {
          ...section,
          items,
        }
      })
      .filter((section) => section.items.length > 0)

    return sections
  }, [isAdmin, isStaff, loadingMe])

  const isActive = (href: string, exact = false) => {
    if (!pathname) return false
    if (exact) return pathname === href
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <motion.aside
      className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}
      variants={sidebarVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={sectionVariants}
        className="animate__animated animate__fadeInLeft animate__faster"
      >
        <Link href="/admin" className="sidebar-logo">
          <motion.div
            className="sidebar-logo-icon"
            whileHover={{ rotate: -8, scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <UtensilsCrossed size={20} />
          </motion.div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                className="sidebar-logo-text"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="sidebar-logo-name animate__animated animate__fadeInDown animate__faster">
                  Restaurantly
                </span>
                <span className="sidebar-logo-badge animate__animated animate__fadeInUp animate__faster">
                  {isAdmin ? 'Admin' : isStaff ? 'Staff' : 'User'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </motion.div>

      <motion.nav className="sidebar-nav" variants={sidebarVariants}>
        {loadingMe ? (
          <motion.div
            className="sidebar-nav-section"
            variants={sectionVariants}
          >
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  className="sidebar-nav-label animate__animated animate__fadeInLeft animate__faster"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  Đang tải quyền...
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          filteredSections.map((section, sectionIndex) => (
            <motion.div
              key={section.label}
              className="sidebar-nav-section"
              variants={sectionVariants}
              transition={{ delay: sectionIndex * 0.03 }}
            >
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    className="sidebar-nav-label animate__animated animate__fadeInLeft animate__faster"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {section.label}
                  </motion.div>
                )}
              </AnimatePresence>

              {section.items.map((item, itemIndex) => {
                const active = isActive(item.href, !!item.exact)
                const Icon = item.icon

                return (
                  <motion.div
                    key={item.href}
                    variants={itemVariants}
                    transition={{ delay: itemIndex * 0.02 }}
                  >
                    <motion.div
                      whileHover={{
                        x: collapsed ? 0 : 4,
                        scale: active ? 1 : 1.01,
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{
                        type: 'spring',
                        stiffness: 320,
                        damping: 22,
                      }}
                    >
                      <Link
                        href={item.href}
                        className={`sidebar-nav-item ${active ? 'active' : ''} ${
                          active
                            ? 'animate__animated animate__pulse animate__faster'
                            : ''
                        }`}
                        data-tooltip={item.label}
                      >
                        <motion.span
                          className="nav-item-icon"
                          animate={
                            active
                              ? {
                                  scale: [1, 1.08, 1],
                                }
                              : { scale: 1 }
                          }
                          transition={{
                            duration: 0.35,
                            ease: 'easeOut',
                          }}
                        >
                          <Icon size={18} />
                        </motion.span>

                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <>
                              <motion.span
                                className="nav-item-label"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -6 }}
                                transition={{ duration: 0.18 }}
                              >
                                {item.label}
                              </motion.span>

                              {item.badge && (
                                <motion.span
                                  className="nav-item-badge"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  transition={{ duration: 0.18 }}
                                >
                                  {item.badge}
                                </motion.span>
                              )}
                            </>
                          )}
                        </AnimatePresence>

                        {collapsed && item.badge && (
                          <motion.span
                            className="nav-item-badge-collapsed"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.18 }}
                          >
                            {item.badge}
                          </motion.span>
                        )}
                      </Link>
                    </motion.div>
                  </motion.div>
                )
              })}

              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    className="sidebar-divider"
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.8 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </motion.nav>
    </motion.aside>
  )
}
