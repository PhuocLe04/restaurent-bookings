'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type MenuItemRow = {
  id: number
  name: string
  image: string | null
  price: number | string
  is_available: boolean | null
  category_id: number
  categories?: {
    id: number
    name: string
  } | null
}

type CategoryOption = {
  id: number
  name: string
}

type ListResponse = {
  items: MenuItemRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

type CategoryListResponse = {
  items: CategoryOption[]
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

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: 'easeOut' as const },
  },
}

export default function MenuItemsPage() {
  const [items, setItems] = useState<MenuItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryId, setCategoryId] = useState('')

  const [page, setPage] = useState(1)
  const limit = 10

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MenuItemRow | null>(null)

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
  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }
  async function loadCategories() {
    try {
      const res = await fetch('/admin/api/categories?page=1&limit=1000', {
        cache: 'no-store',
      })
      const json: CategoryListResponse = await res.json()
      if (!res.ok) return
      setCategories(Array.isArray(json.items) ? json.items : [])
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchData(showRefreshing = false, customPage?: number) {
    try {
      const currentPage = customPage ?? page

      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', String(limit))
      if (keyword.trim()) params.set('q', keyword.trim())
      if (categoryId) params.set('category_id', categoryId)

      const res = await fetch(`/admin/api/menu-items?${params.toString()}`, {
        cache: 'no-store',
      })

      const json: ListResponse = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách món ăn')
      }

      const nextItems = Array.isArray(json.items) ? json.items : []
      const nextTotal = Number(json.total) || 0
      const nextPage = Number(json.page) || currentPage || 1
      const nextTotalPages = Math.max(1, Number(json.totalPages) || 1)

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
    loadCategories()
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword, categoryId])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q.trim())
  }

  function openDeletePopup(item: MenuItemRow) {
    setDeleteTarget(item)
    setDeleteOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return

    try {
      setDeleting(true)
      setDeleteOpen(false)
      showToast('info', 'Đang xóa món ăn...', 'Vui lòng chờ', true)

      const res = await fetch(`/admin/api/menu-items/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || 'Xóa món ăn thất bại')
      }

      showToast(
        'success',
        json?.message || 'Xóa món ăn thành công',
        'Thành công',
      )

      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await fetchData(true)
      }

      setDeleteTarget(null)
    } catch (e: any) {
      const msg = e?.message || 'Đã xảy ra lỗi'
      setError(msg)
      showToast('error', msg, 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (value: number | string) => {
    return Number(value || 0).toLocaleString('vi-VN')
  }

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
        title="Xác nhận xóa món ăn"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa món ăn này không?"
        itemName={deleteTarget?.name || ''}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false)
            setDeleteTarget(null)
          }
        }}
        onConfirm={handleDeleteConfirm}
      />

      <motion.div
        className="menu-items-page"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="menu-items-head animate__animated animate__fadeInDown">
          <div>
            <h1 className="admin-title">Quản lý món ăn</h1>
          </div>

          <div className="menu-items-head-actions">
            <motion.div
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/admin/menu-items/create"
                className="menu-items-btn menu-items-btn-primary"
              >
                + Thêm món ăn
              </Link>
            </motion.div>

            <motion.button
              whileHover={{ y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="menu-items-btn menu-items-btn-secondary"
              onClick={handleRefreshPage}
              disabled={refreshing}
            >
              <span className={refreshing ? 'menu-items-refresh-icon' : ''}>
                ↻
              </span>
              {refreshing ? ' Đang làm mới...' : ' Làm mới'}
            </motion.button>
          </div>
        </div>

        <div className="menu-items-toolbar animate__animated animate__fadeIn">
          <form className="menu-items-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Tìm theo tên món ăn..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="menu-items-btn menu-items-btn-primary"
            >
              Tìm kiếm
            </motion.button>
          </form>

          <div className="menu-items-filters">
            <select
              value={categoryId}
              onChange={(e) => {
                setPage(1)
                setCategoryId(e.target.value)
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="menu-items-alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="menu-items-card animate__animated animate__fadeInUp">
          <div className="menu-items-table-wrap">
            <table className="menu-items-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th style={{ width: 90 }}>Ảnh</th>
                  <th>Tên món</th>
                  <th style={{ width: 180 }}>Danh mục</th>
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
                      className="menu-items-td-muted menu-items-loading-shimmer"
                    >
                      Đang tải danh sách món ăn...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="menu-items-td-muted">
                      Không có dữ liệu món ăn
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
                        <span className="menu-items-strong">#{item.id}</span>
                      </td>

                      <td>
                        <div className="menu-items-image">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              width={52}
                              height={52}
                              style={{ objectFit: 'cover', borderRadius: 10 }}
                            />
                          ) : (
                            <div className="menu-items-image-placeholder">
                              🍽️
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="menu-items-info">
                          <div className="menu-items-details">
                            <span className="menu-items-name">{item.name}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {item.categories ? (
                          <span className="menu-items-category">
                            {item.categories.name}
                          </span>
                        ) : (
                          <span className="menu-items-muted-sm">—</span>
                        )}
                      </td>

                      <td>
                        <span className="menu-items-price">
                          {formatCurrency(item.price)}
                          <span className="menu-items-price-unit">đ</span>
                        </span>
                      </td>

                      <td>
                        <span
                          className={`menu-items-badge ${
                            item.is_available === false
                              ? 'menu-items-badge-unavailable'
                              : 'menu-items-badge-available'
                          }`}
                        >
                          {item.is_available === false ? 'Hết món' : 'Có sẵn'}
                        </span>
                      </td>

                      <td>
                        <div className="menu-items-actions-row">
                          <motion.div
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Link
                              href={`/admin/menu-items/${item.id}`}
                              className="menu-items-btn"
                              title="Xem chi tiết"
                            >
                              Chi tiết
                            </Link>
                          </motion.div>

                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            className="menu-items-btn menu-items-btn-danger"
                            onClick={() => openDeletePopup(item)}
                            title="Xóa món ăn"
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

          <div className="menu-items-card-foot">
            <div className="menu-items-meta">
              <span>Tổng số {total} món ăn</span>
              <span className="menu-items-meta-dot" />
              <span>
                Hiển thị {fromItem} - {toItem}
              </span>
              <span className="menu-items-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="menu-items-pagination">
              <button
                type="button"
                className="menu-items-btn"
                disabled={page <= 1 || loading || refreshing}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="menu-items-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="menu-items-btn"
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
