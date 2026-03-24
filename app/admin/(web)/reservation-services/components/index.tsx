'use client'

import 'animate.css'
import { AnimatePresence, motion, easeOut } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

type ServiceRow = {
  id: number
  name: string
  image: string | null
  description: string | null
  price: number | string
  is_active: boolean
  created_at?: string
}

type ListResponse = {
  items: ServiceRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  loading?: boolean
}

const containerVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: easeOut,
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: easeOut },
  },
}

export default function ServicesIndex() {
  const [items, setItems] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    loading: false,
  })
  const [toastKey, setToastKey] = useState(0)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ServiceRow | null>(null)

  function showToast(
    type: MessageType,
    title: string,
    message: string,
    loading = false,
  ) {
    setToast({
      visible: true,
      type,
      title,
      message,
      loading,
    })
    setToastKey((prev) => prev + 1)
  }

  function hideToast() {
    setToast((prev) => ({ ...prev, visible: false, loading: false }))
  }

  async function loadData(showRefreshing = false, customPage?: number) {
    try {
      const currentPage = customPage ?? page

      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(limit))
      if (keyword.trim()) params.set('q', keyword.trim())

      const res = await fetch(
        `/admin/api/reservation-services?${params.toString()}`,
        {
          cache: 'no-store',
        },
      )

      const data: ListResponse = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Không thể tải danh sách dịch vụ')
      }

      const nextItems = Array.isArray(data.items) ? data.items : []
      const nextTotal = Number(data.total) || 0
      const nextPage = Number(data.page) || currentPage || 1
      const nextTotalPages = Math.max(1, Number(data.totalPages) || 1)

      setItems(nextItems)
      setTotal(nextTotal)
      setTotalPages(nextTotalPages)

      if (nextPage !== page) setPage(nextPage)
      if (currentPage > nextTotalPages) setPage(nextTotalPages)
    } catch (e: any) {
      setError(e.message || 'Đã có lỗi xảy ra')
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q.trim())
  }

  function openDeletePopup(item: ServiceRow) {
    setSelectedItem(item)
    setDeleteOpen(true)
  }

  function closeDeletePopup() {
    if (deleting) return
    setDeleteOpen(false)
    setSelectedItem(null)
  }

  async function handleConfirmDelete() {
    if (!selectedItem) return

    try {
      setDeleting(true)
      showToast(
        'warning',
        'Đang xóa dịch vụ',
        `Đang xử lý xóa "${selectedItem.name}"`,
        true,
      )

      const res = await fetch(
        `/admin/api/reservation-services/${selectedItem.id}`,
        {
          method: 'DELETE',
        },
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Xóa dịch vụ thất bại')
      }

      setDeleteOpen(false)

      showToast(
        'success',
        'Xóa thành công',
        `Dịch vụ "${selectedItem.name}" đã được xóa.`,
      )

      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await loadData(true)
      }

      setSelectedItem(null)
    } catch (e: any) {
      showToast(
        'error',
        'Xóa thất bại',
        e.message || 'Đã xảy ra lỗi khi xóa dịch vụ',
      )
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword])

  const formatCurrency = (value: number | string) =>
    Number(value || 0).toLocaleString('vi-VN')

  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1
  const toItem = total === 0 ? 0 : Math.min(page * limit, total)

  return (
    <>
      <motion.div
        className="services-page"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div className="services-head" variants={itemVariants}>
          <div>
            <h1 className="admin-title animate__animated animate__fadeInDown animate__faster">
              Quản lý dịch vụ
            </h1>
          </div>

          <div className="services-head-actions">
            <motion.div
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/admin/reservation-services/create"
                className="services-btn services-btn-primary"
              >
                + Thêm dịch vụ
              </Link>
            </motion.div>

            <motion.button
              type="button"
              className="services-btn services-btn-secondary"
              onClick={handleRefreshPage}
              disabled={refreshing}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className={refreshing ? 'services-refresh-icon' : ''}
              ></span>
              {refreshing ? ' Đang làm mới...' : ' Làm mới'}
            </motion.button>
          </div>
        </motion.div>

        <motion.div className="services-toolbar" variants={itemVariants}>
          <form
            className="services-search animate__animated animate__fadeInUp animate__faster"
            onSubmit={handleSearch}
          >
            <input
              type="text"
              placeholder="Tìm theo tên dịch vụ..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <motion.button
              type="submit"
              className="services-btn services-btn-primary"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Tìm kiếm
            </motion.button>
          </form>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="services-alert animate__animated animate__shakeX animate__faster"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="services-card" variants={itemVariants}>
          <div className="services-table-wrap">
            <table className="services-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th style={{ width: 90 }}>Ảnh</th>
                  <th style={{ width: 160 }}>Tên dịch vụ</th>
                  <th style={{ width: 220 }}>Mô tả</th>
                  <th style={{ width: 140 }}>Giá</th>
                  <th style={{ width: 140 }}>Trạng thái</th>
                  <th style={{ width: 220 }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="services-td-muted services-loading-shimmer"
                    >
                      Đang tải danh sách dịch vụ...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="services-td-muted">
                      Không có dữ liệu dịch vụ
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        delay: index * 0.03,
                        ease: easeOut,
                      }}
                    >
                      <td>
                        <span className="services-strong">#{item.id}</span>
                      </td>

                      <td>
                        <div className="services-image">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              width={52}
                              height={52}
                              style={{ objectFit: 'cover', borderRadius: 10 }}
                            />
                          ) : (
                            <div className="services-image-placeholder">🛎️</div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="services-name">{item.name}</span>
                      </td>

                      <td>
                        <span className="services-description">
                          {item.description || '—'}
                        </span>
                      </td>

                      <td>
                        <span className="services-price">
                          {formatCurrency(item.price)}
                          <span className="services-price-unit">đ</span>
                        </span>
                      </td>

                      <td>
                        <span
                          className={`services-badge ${
                            item.is_active
                              ? 'services-badge-active'
                              : 'services-badge-inactive'
                          }`}
                        >
                          {item.is_active ? 'Hoạt động' : 'Ngưng hoạt động'}
                        </span>
                      </td>

                      <td>
                        <div className="services-actions-row">
                          <motion.div
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={`/admin/reservation-services/${item.id}`}
                              className="services-btn"
                              title="Xem chi tiết"
                            >
                              Chi tiết
                            </Link>
                          </motion.div>

                          <motion.button
                            type="button"
                            className="services-btn services-btn-danger"
                            onClick={() => openDeletePopup(item)}
                            title="Xóa dịch vụ"
                            whileHover={{ y: -1, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Xóa
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && items.length > 0 && (
            <motion.div
              className="services-card-foot"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="services-meta">
                <span>
                  Hiển thị {fromItem}-{toItem} / {total} dịch vụ
                </span>
                <span className="services-meta-dot" />
                <span>
                  Trang {page} / {totalPages}
                </span>
              </div>

              <div className="services-pagination">
                <motion.button
                  type="button"
                  className="services-btn"
                  disabled={page <= 1 || loading || refreshing}
                  onClick={() => setPage((p) => p - 1)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  ← Trước
                </motion.button>

                <div className="services-page-indicator">
                  <b>{page}</b> / {totalPages}
                </div>

                <motion.button
                  type="button"
                  className="services-btn"
                  disabled={page >= totalPages || loading || refreshing}
                  onClick={() => setPage((p) => p + 1)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sau →
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      <DeleteConfirmModal
        open={deleteOpen}
        title="Xác nhận xóa dịch vụ"
        message="Bạn có chắc muốn xóa dịch vụ này không? Hành động này không thể hoàn tác."
        itemName={selectedItem?.name}
        loading={deleting}
        onClose={closeDeletePopup}
        onConfirm={handleConfirmDelete}
      />

      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={hideToast}
        autoClose={toast.loading ? 0 : 3500}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toastKey}
        loading={toast.loading}
      />
    </>
  )
}
