'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type StaffRow = {
  id: number
  full_name: string
  role: string
  phone: string | null
  is_active: boolean | null
  user_id: number
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
    avatar?: string | null
    created_at?: string | null
  } | null
  shifts?: Array<{
    id: number
    start_time: string
    end_time: string
  }>
}

type ListResponse = {
  items: StaffRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
  loading?: boolean
}

export default function StaffPage() {
  const [items, setItems] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [isActive, setIsActive] = useState('all')

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StaffRow | null>(null)

  function showToast(
    type: MessageType,
    message: string,
    title?: string,
    loading = false,
  ) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
      loading,
    }))
  }

  async function fetchData(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (keyword.trim()) params.set('q', keyword.trim())
      if (isActive !== 'all') params.set('is_active', isActive)

      const res = await fetch(`/admin/api/staff?${params.toString()}`, {
        cache: 'no-store',
      })
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách nhân viên')
      }

      setItems(json.items || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
    } catch (e: any) {
      const msg = e?.message || 'Đã xảy ra lỗi'
      setError(msg)
      setItems([])
      setTotal(0)
      setTotalPages(1)
      showToast('error', msg, 'Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword, isActive])

  function openDeletePopup(item: StaffRow) {
    if (item.role === 'admin') {
      showToast(
        'warning',
        'Không thể xóa quản trị viên',
        'Thao tác không hợp lệ',
      )
      return
    }

    setSelectedItem(item)
    setDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedItem || deleting) return

    try {
      setDeleting(true)
      setDeleteOpen(false)
      showToast('info', 'Đang xóa nhân viên', 'Vui lòng chờ', true)

      const res = await fetch(`/admin/api/staff/${selectedItem.id}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || 'Xóa nhân viên thất bại')
      }

      showToast(
        'success',
        json?.message || 'Xóa nhân viên thành công',
        'Thành công',
      )

      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await fetchData(true)
      }

      setSelectedItem(null)
    } catch (e: any) {
      const msg = e?.message || 'Đã xảy ra lỗi'
      setError(msg)
      showToast('error', msg, 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  function handleRefreshPage() {
    setRefreshing(true)
    showToast('info', 'Đang làm mới dữ liệu', 'Vui lòng chờ', true)
    window.location.reload()
  }

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPage(1)
    setKeyword(q.trim())
  }

  const getRoleBadgeClass = (role: string) => {
    if (role === 'admin') return 'staff-badge-admin'
    if (role === 'manager') return 'staff-badge-manager'
    if (role === 'cashier') return 'staff-badge-cashier'
    if (role === 'service') return 'staff-badge-service'
    return 'staff-badge-staff'
  }

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Quản trị viên'
    if (role === 'manager') return 'Quản lý'
    if (role === 'cashier') return 'Thu ngân'
    if (role === 'service') return 'Phục vụ'
    if (role === 'staff') return 'Nhân viên'
    return role || '—'
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      time: date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: date.toLocaleDateString('vi-VN'),
    }
  }

  const getInitials = (name: string) => {
    return (name || '?')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const rowVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 12,
      },
    },
  }

  const cellVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  }

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        toastKey={toast.key}
        loading={toast.loading}
        autoClose={toast.loading ? 0 : 2600}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        position="top-right"
      />

      <DeleteConfirmModal
        open={deleteOpen}
        loading={deleting}
        title="Xác nhận xóa nhân viên"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa nhân viên này không?"
        itemName={selectedItem?.full_name || ''}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false)
            setSelectedItem(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

      <motion.div
        className="staff-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="staff-head">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.45 }}
          >
            <h1 className="admin-title animate__animated animate__fadeInUp">
              Quản lý nhân viên
            </h1>
          </motion.div>

          <motion.div
            className="staff-head-actions"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.45 }}
          >
            <Link
              href="/admin/staff/create"
              className="staff-btn staff-btn-primary"
            >
              + Thêm nhân viên
            </Link>

            <motion.button
              type="button"
              className="staff-btn staff-btn-secondary"
              onClick={handleRefreshPage}
              disabled={refreshing}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className={refreshing ? 'staff-refresh-icon' : ''}>↻</span>
              {refreshing ? ' Đang làm mới...' : ' Làm mới'}
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          className="staff-toolbar"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.45 }}
        >
          <motion.form
            className="staff-search"
            onSubmit={handleSearch}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.45 }}
          >
            <input
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="animate__animated animate__fadeIn"
            />

            <motion.button
              type="submit"
              className="staff-btn staff-btn-primary"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Tìm kiếm
            </motion.button>
          </motion.form>

          <motion.div
            className="staff-filters"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45 }}
          >
            <select
              value={isActive}
              onChange={(e) => {
                setPage(1)
                setIsActive(e.target.value)
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã khóa</option>
            </select>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="staff-alert animate__animated animate__shakeX"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="staff-card"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.4,
            duration: 0.45,
            type: 'spring',
            stiffness: 100,
          }}
        >
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.45 }}
                >
                  <th style={{ width: 80 }}>ID</th>
                  <th style={{ width: 240 }}>Nhân viên</th>
                  <th style={{ width: 150 }}>Vai trò</th>
                  <th style={{ width: 140 }}>Số điện thoại</th>
                  <th style={{ width: 220 }}>Ca làm gần nhất</th>
                  <th style={{ width: 130 }}>Trạng thái</th>
                  <th className="actions-col">Thao tác</th>
                </motion.tr>
              </thead>

              <tbody>
                {loading ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <td
                      colSpan={7}
                      className="staff-td-muted staff-loading-shimmer"
                    >
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.4 }}
                      >
                        Đang tải danh sách nhân viên...
                      </motion.div>
                    </td>
                  </motion.tr>
                ) : items.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <td colSpan={7} className="staff-td-muted">
                      Không tìm thấy nhân viên nào
                    </td>
                  </motion.tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {items.map((item, index) => {
                      const latestShift = item.shifts?.[0]
                      const startFormatted = latestShift
                        ? formatDateTime(latestShift.start_time)
                        : null
                      const endFormatted = latestShift
                        ? formatDateTime(latestShift.end_time)
                        : null

                      return (
                        <motion.tr
                          key={item.id}
                          variants={rowVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ delay: index * 0.04 }}
                          whileHover={{
                            scale: 1.004,
                          }}
                        >
                          <motion.td variants={cellVariants}>
                            <span className="staff-strong">#{item.id}</span>
                          </motion.td>

                          <motion.td variants={cellVariants}>
                            <div className="staff-info">
                              <motion.div
                                className="staff-avatar"
                                whileHover={{ scale: 1.08 }}
                                transition={{ duration: 0.2 }}
                              >
                                {item.users?.avatar ? (
                                  <img
                                    src={item.users.avatar}
                                    alt={item.full_name}
                                  />
                                ) : (
                                  <span>{getInitials(item.full_name)}</span>
                                )}
                              </motion.div>

                              <div className="staff-details">
                                <span className="staff-name">
                                  {item.full_name}
                                </span>
                                {item.users?.email && (
                                  <span className="staff-email">
                                    {item.users.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.td>

                          <motion.td variants={cellVariants}>
                            <motion.span
                              className={`staff-badge ${getRoleBadgeClass(item.role)}`}
                              whileHover={{ scale: 1.04 }}
                            >
                              {getRoleLabel(item.role)}
                            </motion.span>
                          </motion.td>

                          <motion.td variants={cellVariants}>
                            {item.phone || '—'}
                          </motion.td>

                          <motion.td variants={cellVariants}>
                            {latestShift ? (
                              <div className="staff-shift">
                                <span className="staff-shift-time">
                                  {startFormatted?.time} - {endFormatted?.time}
                                </span>
                                <span className="staff-shift-date">
                                  {startFormatted?.date}
                                </span>
                              </div>
                            ) : (
                              <span className="staff-muted-sm">
                                Chưa có ca làm việc
                              </span>
                            )}
                          </motion.td>

                          <motion.td variants={cellVariants}>
                            <motion.span
                              className={`staff-badge ${
                                item.is_active === false
                                  ? 'staff-badge-inactive'
                                  : 'staff-badge-active'
                              }`}
                              whileHover={{ scale: 1.04 }}
                            >
                              {item.is_active === false
                                ? 'Đã khóa'
                                : 'Hoạt động'}
                            </motion.span>
                          </motion.td>

                          <motion.td variants={cellVariants}>
                            <div className="staff-actions-row">
                              <Link
                                href={`/admin/staff/${item.id}`}
                                className="staff-btn"
                              >
                                Chi tiết
                              </Link>

                              <motion.button
                                type="button"
                                className="staff-btn staff-btn-danger"
                                onClick={() => openDeletePopup(item)}
                                disabled={item.role === 'admin'}
                                title={
                                  item.role === 'admin'
                                    ? 'Không thể xóa quản trị viên'
                                    : ''
                                }
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                              >
                                Xóa
                              </motion.button>
                            </div>
                          </motion.td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {!loading && items.length > 0 && (
            <motion.div
              className="staff-card-foot"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.45 }}
            >
              <div className="staff-meta">
                <span>Tổng số {total} nhân viên</span>
                <span className="staff-meta-dot" />
                <span>
                  Trang {page} / {totalPages}
                </span>
              </div>

              <div className="staff-pagination">
                <motion.button
                  type="button"
                  className="staff-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  ← Trước
                </motion.button>

                <div className="staff-page-indicator">
                  <b>{page}</b> / {totalPages}
                </div>

                <motion.button
                  type="button"
                  className="staff-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Sau →
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </>
  )
}
