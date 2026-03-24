'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type Category = {
  id: number
  name: string
  is_active: boolean | null
  _count?: {
    menu_items: number
  }
}

type ListResponse = {
  items: Category[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

type DetailResponse = {
  item: Category
  message?: string
}

type SaveResponse = {
  item?: Category
  message?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
  loading?: boolean
}

type ModalMode = 'create' | 'detail'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: { duration: 0.18, ease: 'easeInOut' as const },
  },
}

export default function CategoriesIndex() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  const [page, setPage] = useState(1)
  const limit = 10

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [formName, setFormName] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

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

  function resetForm() {
    setEditingId(null)
    setFormName('')
    setFormIsActive(true)
  }

  async function loadData({
    showRefreshing = false,
    pageOverride,
    keywordOverride,
  }: {
    showRefreshing?: boolean
    pageOverride?: number
    keywordOverride?: string
  } = {}) {
    try {
      const currentPage = pageOverride ?? page
      const currentKeyword = keywordOverride ?? keyword

      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(limit))
      if (currentKeyword.trim()) {
        params.set('q', currentKeyword.trim())
      }

      const res = await fetch(`/admin/api/categories?${params.toString()}`, {
        cache: 'no-store',
      })

      let data: ListResponse | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải danh sách')
      }

      const nextItems = Array.isArray(data?.items) ? data.items : []
      const nextTotal = Number(data?.total) || 0
      const nextPage = Number(data?.page) || currentPage || 1
      const nextTotalPages = Math.max(1, Number(data?.totalPages) || 1)

      setItems(nextItems)
      setTotal(nextTotal)
      setTotalPages(nextTotalPages)

      if (nextPage !== page) {
        setPage(nextPage)
      }

      if (currentPage > nextTotalPages) {
        setPage(nextTotalPages)
      }
    } catch (e: any) {
      const msg = e?.message || 'Đã có lỗi xảy ra'
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
  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const nextKeyword = q.trim()
    setPage(1)
    setKeyword(nextKeyword)
  }

  function openCreateModal() {
    resetForm()
    setModalMode('create')
    setModalOpen(true)
  }

  async function openDetailModal(item: Category) {
    try {
      resetForm()
      setModalMode('detail')
      setEditingId(item.id)
      setModalOpen(true)
      setDetailLoading(true)

      const res = await fetch(`/admin/api/categories/${item.id}`, {
        cache: 'no-store',
      })

      let data: DetailResponse | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải chi tiết danh mục')
      }

      setFormName(data?.item?.name || '')
      setFormIsActive(Boolean(data?.item?.is_active ?? true))
    } catch (e: any) {
      const msg = e?.message || 'Không thể tải chi tiết danh mục'
      setError(msg)
      setModalOpen(false)
      showToast('error', msg, 'Lỗi tải chi tiết')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeModal() {
    if (saving || detailLoading) return
    setModalOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const name = formName.trim()

    if (!name) {
      showToast('warning', 'Tên danh mục là bắt buộc', 'Thiếu thông tin')
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast(
        'info',
        modalMode === 'create'
          ? 'Đang tạo danh mục...'
          : 'Đang cập nhật danh mục...',
        'Vui lòng chờ',
        true,
      )

      const payload = {
        name,
        is_active: formIsActive,
      }

      const url =
        modalMode === 'create'
          ? '/admin/api/categories'
          : `/admin/api/categories/${editingId}`

      const method = modalMode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data: SaveResponse | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        throw new Error(
          data?.message ||
            (modalMode === 'create'
              ? 'Tạo danh mục thất bại'
              : 'Cập nhật danh mục thất bại'),
        )
      }

      showToast(
        'success',
        data?.message ||
          (modalMode === 'create'
            ? 'Tạo danh mục thành công'
            : 'Cập nhật danh mục thành công'),
        'Thành công',
      )

      setModalOpen(false)
      resetForm()
      await loadData({ showRefreshing: true })
    } catch (e: any) {
      const msg = e?.message || 'Lưu thất bại'
      setError(msg)
      showToast('error', msg, 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  function openDeletePopup(item: Category) {
    setDeleteTarget(item)
    setDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return

    try {
      setDeleting(true)
      setDeleteOpen(false)
      showToast('info', 'Đang xóa danh mục...', 'Vui lòng chờ', true)

      const res = await fetch(`/admin/api/categories/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      let data: { message?: string } | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Xóa thất bại')
      }

      showToast(
        'success',
        data?.message || 'Xóa danh mục thành công',
        'Thành công',
      )

      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1)
      } else {
        await loadData({ showRefreshing: true })
      }

      setDeleteTarget(null)
    } catch (e: any) {
      const msg = e?.message || 'Xóa thất bại'
      setError(msg)
      showToast('error', msg, 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword])

  const fromItem = useMemo(
    () => (total === 0 ? 0 : (page - 1) * limit + 1),
    [page, total],
  )

  const toItem = useMemo(
    () => (total === 0 ? 0 : Math.min(page * limit, total)),
    [page, total],
  )

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
        title="Xác nhận xóa danh mục"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa danh mục này không?"
        itemName={deleteTarget?.name || ''}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false)
            setDeleteTarget(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="categories-modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeModal}
          >
            <motion.div
              className="categories-modal animate__animated animate__fadeInUp"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="categories-modal-head">
                <div>
                  <h3 className="categories-modal-title">
                    {modalMode === 'create'
                      ? 'Thêm danh mục'
                      : 'Chi tiết danh mục'}
                  </h3>
                  <p className="categories-modal-subtitle">
                    {modalMode === 'create'
                      ? 'Nhập thông tin để tạo danh mục mới.'
                      : 'Xem và chỉnh sửa thông tin danh mục.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="categories-modal-close"
                  onClick={closeModal}
                  disabled={saving || detailLoading}
                >
                  ✕
                </button>
              </div>

              {detailLoading ? (
                <div className="categories-modal-loading">
                  Đang tải dữ liệu...
                </div>
              ) : (
                <form className="categories-modal-form" onSubmit={handleSubmit}>
                  <div className="categories-modal-field">
                    <label htmlFor="category-name">Tên danh mục</label>
                    <input
                      id="category-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Nhập tên danh mục..."
                      disabled={saving}
                    />
                  </div>

                  <div className="categories-modal-field">
                    <label htmlFor="category-status">Trạng thái hiển thị</label>
                    <div className="categories-select-wrap">
                      <select
                        id="category-status"
                        className="categories-select"
                        value={formIsActive ? 'true' : 'false'}
                        onChange={(e) =>
                          setFormIsActive(e.target.value === 'true')
                        }
                        disabled={saving}
                      >
                        <option value="true">Hiển thị</option>
                        <option value="false">Ẩn</option>
                      </select>
                      <span className="categories-select-icon">
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>{' '}
                    </div>
                  </div>

                  <div className="categories-modal-actions">
                    <button
                      type="button"
                      className="categories-btn"
                      onClick={closeModal}
                      disabled={saving}
                    >
                      Đóng
                    </button>

                    <button
                      type="submit"
                      className="categories-btn categories-btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? modalMode === 'create'
                          ? 'Đang thêm...'
                          : 'Đang lưu...'
                        : modalMode === 'create'
                          ? 'Thêm mới'
                          : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="categories-page"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        <div className="categories-head animate__animated animate__fadeInDown">
          <div>
            <h1 className="categories-h1">Quản lý danh mục món ăn</h1>
            <p className="categories-muted">
              Theo dõi, tìm kiếm và quản lý danh mục món ăn
            </p>
          </div>

          <div className="categories-head-actions">
            <motion.button
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="categories-btn categories-btn-primary"
              onClick={openCreateModal}
            >
              + Thêm danh mục
            </motion.button>

            <motion.button
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="categories-btn categories-btn-secondary"
              onClick={handleRefreshPage}
              disabled={refreshing}
            >
              <span className={refreshing ? 'categories-refresh-icon' : ''}>
                ↻
              </span>
              {refreshing ? ' Đang làm mới...' : ' Làm mới'}
            </motion.button>
          </div>
        </div>

        <div className="categories-toolbar animate__animated animate__fadeIn">
          <form className="categories-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm theo tên danh mục..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="categories-btn categories-btn-primary"
            >
              Tìm kiếm
            </motion.button>
          </form>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="categories-alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="categories-card animate__animated animate__fadeInUp">
          <div className="categories-table-wrap">
            <table className="categories-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th>Tên danh mục</th>
                  <th style={{ width: 120 }}>Hiển thị</th>
                  <th style={{ width: 120 }}>Số món</th>
                  <th style={{ width: 220 }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="categories-td-muted categories-loading-shimmer"
                    >
                      Đang tải danh sách danh mục...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="categories-td-muted">
                      Không có dữ liệu danh mục
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.03 }}
                    >
                      <td>
                        <span className="categories-strong">#{item.id}</span>
                      </td>

                      <td>
                        <div className="categories-info">
                          <div className="categories-details">
                            <span className="categories-name">{item.name}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`categories-badge ${
                            item.is_active
                              ? 'categories-badge-active'
                              : 'categories-badge-inactive'
                          }`}
                        >
                          {item.is_active ? 'Có' : 'Không'}
                        </span>
                      </td>

                      <td>
                        <span className="categories-count">
                          {item._count?.menu_items ?? 0} món
                        </span>
                      </td>

                      <td>
                        <div className="categories-actions-row">
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            className="categories-btn"
                            title="Xem chi tiết"
                            onClick={() => openDetailModal(item)}
                          >
                            Chi tiết
                          </motion.button>

                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            className="categories-btn categories-btn-danger"
                            onClick={() => openDeletePopup(item)}
                            title="Xóa danh mục"
                            disabled={deleting}
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

          <div className="categories-card-foot">
            <div className="categories-meta">
              <span>
                Hiển thị {fromItem}-{toItem} / {total} danh mục
              </span>
              <span className="categories-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="categories-pagination">
              <button
                type="button"
                className="categories-btn"
                disabled={page <= 1 || loading || refreshing}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="categories-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="categories-btn"
                disabled={page >= totalPages || loading || refreshing}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
