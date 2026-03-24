'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import '../page.css'

type ShiftRow = {
  id: number
  staff_id: number
  start_time: string
  end_time: string
  staff?: {
    id: number
    full_name: string
    role: string
    phone: string | null
    is_active: boolean | null
    users?: {
      id: number
      full_name: string
      email: string
      phone: string
    } | null
  } | null
}

type ListResponse = {
  items: ShiftRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  access?: {
    userId: number
    isAdmin: boolean
    isStaff: boolean
  }
  message?: string
}

type AccessState = {
  checked: boolean
  isAdmin: boolean
  isStaff: boolean
}

export default function ShiftsPage() {
  const [items, setItems] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [staffIdInput, setStaffIdInput] = useState('')
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')

  const [staffId, setStaffId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [page, setPage] = useState(1)
  const limit = 10

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [access, setAccess] = useState<AccessState>({
    checked: false,
    isAdmin: false,
    isStaff: false,
  })

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteLabel, setDeleteLabel] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<ShiftRow | null>(null)

  const [toast, setToast] = useState<{
    visible: boolean
    type: MessageType
    title?: string
    message: string
    loading?: boolean
    key: number
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    loading: false,
    key: 0,
  })

  const showToast = useCallback(
    (type: MessageType, message: string, title?: string, loading = false) => {
      setToast((prev) => ({
        visible: true,
        type,
        title,
        message,
        loading,
        key: prev.key + 1,
      }))
    },
    [],
  )

  const closeToast = useCallback(() => {
    setToast((prev) => ({
      ...prev,
      visible: false,
      loading: false,
    }))
  }, [])

  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }

  const resetDeleteState = useCallback(() => {
    setDeleteId(null)
    setDeleteLabel('')
  }, [])

  const closeDetailModal = useCallback(() => {
    setDetailOpen(false)
    setDetailItem(null)
  }, [])

  const fetchData = useCallback(
    async ({
      showRefreshing = false,
      pageOverride,
      staffIdOverride,
      fromOverride,
      toOverride,
    }: {
      showRefreshing?: boolean
      pageOverride?: number
      staffIdOverride?: string
      fromOverride?: string
      toOverride?: string
    } = {}) => {
      try {
        const currentPage = pageOverride ?? page
        const currentStaffId = staffIdOverride ?? staffId
        const currentFrom = fromOverride ?? from
        const currentTo = toOverride ?? to

        if (showRefreshing) setRefreshing(true)
        else setLoading(true)

        setError('')

        const params = new URLSearchParams()
        params.set('page', String(currentPage))
        params.set('limit', String(limit))

        if (currentStaffId.trim()) params.set('staff_id', currentStaffId.trim())
        if (currentFrom) params.set('from', currentFrom)
        if (currentTo) params.set('to', currentTo)

        const res = await fetch(`/admin/api/shifts?${params.toString()}`, {
          cache: 'no-store',
        })

        let json: ListResponse | null = null
        try {
          json = await res.json()
        } catch {
          json = null
        }

        if (!res.ok) {
          throw new Error(json?.message || 'Không thể tải danh sách ca làm')
        }

        const nextItems = Array.isArray(json?.items) ? json.items : []
        const nextTotal = Number(json?.total) || 0
        const nextTotalPages = Math.max(1, Number(json?.totalPages) || 1)
        const nextPage = Number(json?.page) || currentPage || 1

        setItems(nextItems)
        setTotal(nextTotal)
        setTotalPages(nextTotalPages)

        setAccess({
          checked: true,
          isAdmin: json?.access?.isAdmin === true,
          isStaff: json?.access?.isStaff === true,
        })

        if (nextPage !== page) {
          setPage(nextPage)
        }

        if (currentPage > nextTotalPages) {
          setPage(nextTotalPages)
        }
      } catch (e: any) {
        setError(e?.message || 'Đã xảy ra lỗi')
        setItems([])
        setTotal(0)
        setTotalPages(1)
        setAccess({
          checked: true,
          isAdmin: false,
          isStaff: false,
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [page, staffId, from, to],
  )

  useEffect(() => {
    fetchData()
  }, [page, staffId, from, to, fetchData])

  async function handleFilter(e: React.FormEvent) {
    e.preventDefault()

    const nextStaffId = staffIdInput.trim()
    const nextFrom = fromInput
    const nextTo = toInput

    setPage(1)
    setStaffId(nextStaffId)
    setFrom(nextFrom)
    setTo(nextTo)
  }

  function handleClearFilter() {
    setStaffIdInput('')
    setFromInput('')
    setToInput('')

    setPage(1)
    setStaffId('')
    setFrom('')
    setTo('')
  }

  async function handleDelete() {
    if (!access.isAdmin) {
      showToast(
        'warning',
        'Bạn không có quyền xóa ca làm',
        'Truy cập bị từ chối',
      )
      return
    }

    if (!deleteId) return

    try {
      setDeleting(true)

      const res = await fetch(`/admin/api/shifts/${deleteId}`, {
        method: 'DELETE',
      })

      let json: { message?: string } | null = null
      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok) {
        throw new Error(json?.message || 'Xóa ca làm thất bại')
      }

      resetDeleteState()
      showToast('success', 'Ca làm đã được xóa thành công', 'Thành công')

      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1)
      } else {
        await fetchData({ showRefreshing: true })
      }
    } catch (e: any) {
      showToast('error', e?.message || 'Đã xảy ra lỗi', 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  function openDeleteModal(item: ShiftRow) {
    setDeleteId(item.id)
    setDeleteLabel(
      item.staff?.full_name
        ? `Ca làm của ${item.staff.full_name}`
        : `Ca làm #${item.id}`,
    )
  }

  function openDetailModal(item: ShiftRow) {
    setDetailItem(item)
    setDetailOpen(true)
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function getRoleBadgeClass(role: string) {
    if (role === 'admin') return 'shift-badge-admin'
    return 'shift-badge-staff'
  }

  function getRoleLabel(role: string) {
    if (role === 'admin') return 'Quản trị viên'
    if (role === 'staff') return 'Nhân viên'
    return role
  }

  function getDurationText(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()

    if (diffMs <= 0) return '—'

    const totalMinutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (minutes === 0) return `${hours} tiếng`
    return `${hours} tiếng ${minutes} phút`
  }

  const canViewPage = access.isAdmin || access.isStaff

  const detailDuration = useMemo(() => {
    if (!detailItem) return '—'
    return getDurationText(detailItem.start_time, detailItem.end_time)
  }, [detailItem])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
      },
    },
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  }

  return (
    <motion.div
      className="shift-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="shift-head">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="admin-title animate__animated animate__fadeInUp">
            Quản lý ca làm
          </h1>
        </motion.div>

        <motion.div
          className="shift-head-actions"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Link
            href="/admin/shifts/create"
            className="shift-btn shift-btn-primary"
          >
            + Thêm ca làm
          </Link>

          <motion.button
            type="button"
            className="shift-btn shift-btn-secondary"
            onClick={handleRefreshPage}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={refreshing ? 'shift-refresh-icon' : ''}></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {access.checked && !canViewPage && !loading && (
          <motion.div
            className="shift-alert animate__animated animate__shakeX"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            ⚠️ Bạn không có quyền truy cập trang này
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form
        className="shift-toolbar"
        onSubmit={handleFilter}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <motion.input
          type="number"
          min="1"
          placeholder="ID nhân viên"
          value={staffIdInput}
          onChange={(e) => setStaffIdInput(e.target.value)}
          whileFocus={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        />

        <motion.input
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          placeholder="Từ ngày"
          whileFocus={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        />

        <motion.input
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          placeholder="Đến ngày"
          whileFocus={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        />

        <motion.button
          type="submit"
          className="shift-btn shift-btn-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Lọc
        </motion.button>

        <motion.button
          type="button"
          className="shift-btn shift-btn-secondary"
          onClick={handleClearFilter}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Xóa lọc
        </motion.button>
      </motion.form>

      <AnimatePresence>
        {error && (
          <motion.div
            className="shift-alert animate__animated animate__shakeX"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="shift-card"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          delay: 0.4,
          duration: 0.5,
          type: 'spring',
          stiffness: 100,
        }}
      >
        <div className="shift-table-wrap">
          <motion.table className="shift-table">
            <thead>
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <th style={{ width: 70 }}>ID</th>
                <th style={{ width: 200 }}>Nhân viên</th>
                <th style={{ width: 140 }}>Vai trò</th>
                <th style={{ width: 220 }}>Thời gian</th>
                <th style={{ width: 140 }}>Trạng thái</th>
                <th className="actions-col">Thao tác</th>
              </motion.tr>
            </thead>

            <tbody>
              {loading ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <td
                    colSpan={6}
                    className="shift-td-muted shift-loading-shimmer"
                  >
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      Đang tải danh sách ca làm...
                    </motion.div>
                  </td>
                </motion.tr>
              ) : items.length === 0 ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.td colSpan={6} className="shift-td-muted">
                    Không tìm thấy ca làm nào
                  </motion.td>
                </motion.tr>
              ) : (
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                      whileHover={{
                        scale: 1.01,
                        backgroundColor: 'rgba(0,0,0,0.02)',
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.td variants={itemVariants}>
                        <span className="shift-strong animate__animated animate__fadeIn">
                          #{item.id}
                        </span>
                      </motion.td>

                      <motion.td variants={itemVariants}>
                        {item.staff ? (
                          <div className="shift-info">
                            <motion.div
                              className="shift-avatar"
                              whileHover={{ scale: 1.1 }}
                              transition={{ duration: 0.2 }}
                            >
                              {item.staff.full_name?.charAt(0)?.toUpperCase() ||
                                '?'}
                            </motion.div>

                            <div className="shift-details">
                              <span className="shift-name">
                                {item.staff.full_name}
                              </span>

                              {item.staff.phone && (
                                <span className="shift-phone">
                                  {item.staff.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="shift-muted-sm">
                            Không có thông tin
                          </span>
                        )}
                      </motion.td>

                      <motion.td variants={itemVariants}>
                        {item.staff ? (
                          <motion.span
                            className={`shift-badge ${getRoleBadgeClass(item.staff.role)}`}
                            whileHover={{ scale: 1.05 }}
                          >
                            {getRoleLabel(item.staff.role)}
                          </motion.span>
                        ) : (
                          '—'
                        )}
                      </motion.td>

                      <motion.td variants={itemVariants}>
                        <div className="shift-time">
                          <div className="shift-time-item">
                            <span className="shift-time-label">Bắt đầu:</span>
                            <span className="shift-time-value">
                              {formatTime(item.start_time)}
                            </span>
                            <span className="shift-time-date">
                              {formatDate(item.start_time)}
                            </span>
                          </div>

                          <div className="shift-time-item">
                            <span className="shift-time-label">Kết thúc:</span>
                            <span className="shift-time-value">
                              {formatTime(item.end_time)}
                            </span>
                            <span className="shift-time-date">
                              {formatDate(item.end_time)}
                            </span>
                          </div>
                        </div>
                      </motion.td>

                      <motion.td variants={itemVariants}>
                        {item.staff ? (
                          <motion.span
                            className={`shift-badge ${
                              item.staff.is_active === false
                                ? 'shift-badge-inactive'
                                : 'shift-badge-active'
                            }`}
                            whileHover={{ scale: 1.05 }}
                          >
                            {item.staff.is_active === false
                              ? 'Đã khóa'
                              : 'Hoạt động'}
                          </motion.span>
                        ) : (
                          '—'
                        )}
                      </motion.td>

                      <motion.td variants={itemVariants}>
                        <div className="shift-actions-row">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <button
                              type="button"
                              className="shift-btn"
                              onClick={() => openDetailModal(item)}
                            >
                              Chi tiết
                            </button>
                          </motion.div>

                          {access.isAdmin && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <button
                                type="button"
                                className="shift-btn shift-btn-danger"
                                onClick={() => openDeleteModal(item)}
                              >
                                Xóa
                              </button>
                            </motion.div>
                          )}
                        </div>
                      </motion.td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </motion.table>
        </div>

        {!loading && items.length > 0 && (
          <motion.div
            className="shift-card-foot"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="shift-meta">
              <span>Tổng số {total} ca làm</span>
              <span className="shift-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="shift-pagination">
              <motion.button
                type="button"
                className="shift-btn"
                disabled={page <= 1 || loading || refreshing}
                onClick={() => setPage((p) => p - 1)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ← Trước
              </motion.button>

              <motion.div
                className="shift-page-indicator"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
              >
                <b>{page}</b> / {totalPages}
              </motion.div>

              <motion.button
                type="button"
                className="shift-btn"
                disabled={page >= totalPages || loading || refreshing}
                onClick={() => setPage((p) => p + 1)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sau →
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <DeleteConfirmModal
        open={deleteId !== null}
        title="Xóa ca làm"
        message="Bạn có chắc muốn xóa ca làm này không? Hành động này không thể hoàn tác."
        itemName={deleteLabel}
        loading={deleting}
        onClose={() => {
          if (!deleting) resetDeleteState()
        }}
        onConfirm={handleDelete}
      />

      <AnimatePresence>
        {detailOpen && detailItem && (
          <motion.div
            className="shift-detail-modal-overlay"
            onClick={closeDetailModal}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="shift-detail-modal"
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="shift-detail-head">
                <div>
                  <motion.h3
                    className="shift-detail-title"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    Chi tiết ca làm
                  </motion.h3>
                  <motion.p
                    className="shift-detail-subtitle"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Mã ca làm: #{detailItem.id}
                  </motion.p>
                </div>

                <motion.button
                  type="button"
                  className="shift-detail-close"
                  onClick={closeDetailModal}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>

              <motion.div
                className="shift-detail-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="shift-detail-grid">
                  {[
                    {
                      label: 'Nhân viên',
                      value:
                        detailItem.staff?.full_name || 'Không có thông tin',
                    },
                    {
                      label: 'Vai trò',
                      value: detailItem.staff
                        ? getRoleLabel(detailItem.staff.role)
                        : '—',
                    },
                    {
                      label: 'Số điện thoại',
                      value:
                        detailItem.staff?.phone ||
                        detailItem.staff?.users?.phone ||
                        '—',
                    },
                    {
                      label: 'Email',
                      value: detailItem.staff?.users?.email || '—',
                    },
                    {
                      label: 'Bắt đầu',
                      value: formatDateTime(detailItem.start_time),
                    },
                    {
                      label: 'Kết thúc',
                      value: formatDateTime(detailItem.end_time),
                    },
                    { label: 'Thời lượng', value: detailDuration },
                    {
                      label: 'Trạng thái nhân viên',
                      value:
                        detailItem.staff?.is_active === false
                          ? 'Đã khóa'
                          : 'Hoạt động',
                    },
                  ].map((field, index) => (
                    <motion.div
                      key={field.label}
                      className="shift-detail-item"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                    >
                      <span className="shift-detail-label">{field.label}</span>
                      <strong className="shift-detail-value">
                        {field.value}
                      </strong>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="shift-detail-actions"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.button
                  type="button"
                  className="shift-btn shift-btn-secondary"
                  onClick={closeDetailModal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Đóng
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        autoClose={3000}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
        loading={toast.loading}
      />
    </motion.div>
  )
}
