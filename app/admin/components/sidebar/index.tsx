'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarCheck,
  UtensilsCrossed,
  Users,
  ChefHat,
  Images,
  MessageSquare,
  Package,
  CombineIcon,
  UserCog,
  UserCircle,
  Settings,
  PieChart,
  ShoppingBag,
  CreditCard,
  Clock,
  Table,
  Grid,
  FileText,
  BookOpen,
  Tag,
  Gift,
  Briefcase,
  Database,
  Bell,
  UserCheck,
} from 'lucide-react'
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
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Tổng quan',
    items: [
      {
        href: '/admin/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        exact: true,
      },
      {
        href: '/admin/analytics',
        label: 'Phân tích',
        icon: PieChart,
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
      },
      {
        href: '/admin/checkin',
        label: 'Check-in',
        icon: UserCheck,
      },
      {
        href: '/admin/order',
        label: 'Đơn hàng',
        icon: ShoppingBag,
      },
      {
        href: '/admin/order-items',
        label: 'Chi tiết đơn hàng',
        icon: Package,
      },
      {
        href: '/admin/payment',
        label: 'Thanh toán',
        icon: CreditCard,
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
      },
      {
        href: '/admin/categories',
        label: 'Danh mục',
        icon: Grid,
      },
      {
        href: '/admin/combo',
        label: 'Combo',
        icon: CombineIcon,
      },
      {
        href: '/admin/combo-menu-items',
        label: 'Món trong Combo',
        icon: Package,
      },
      {
        href: '/admin/reservation-services',
        label: 'Dịch vụ',
        icon: Gift,
      },
      {
        href: '/admin/combo-services',
        label: 'Dịch vụ trong Combo',
        icon: CombineIcon,
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
      },
      {
        href: '/admin/table-type',
        label: 'Loại bàn',
        icon: Grid,
      },
      {
        href: '/admin/reservation-table',
        label: 'Bàn đã đặt',
        icon: CalendarCheck,
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
      },
      {
        href: '/admin/shifts',
        label: 'Ca làm việc',
        icon: Clock,
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
      },
      {
        href: '/admin/membership',
        label: 'Hạng thành viên',
        icon: UserCircle,
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
      },
    ],
  },
]

export default function AdminSidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact = false) => {
    if (!pathname) return false
    if (exact) return pathname === href
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <Link href="/admin" className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <UtensilsCrossed size={20} />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">Restaurantly</span>
            <span className="sidebar-logo-badge">Admin</span>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label} className="sidebar-nav-section">
            {!collapsed && (
              <div className="sidebar-nav-label">{section.label}</div>
            )}

            {section.items.map((item) => {
              const active = isActive(item.href, !!item.exact)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-nav-item ${active ? 'active' : ''}`}
                  data-tooltip={item.label}
                >
                  <span className="nav-item-icon">
                    <Icon size={18} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="nav-item-label">{item.label}</span>
                      {item.badge && (
                        <span className="nav-item-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="nav-item-badge-collapsed">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}

            {!collapsed && <div className="sidebar-divider" />}
          </div>
        ))}
      </nav>
    </aside>
  )
}
