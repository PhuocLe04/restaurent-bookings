'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import './index.css'

type BlogRow = {
  id: number
  title: string
  slug: string
  short_description?: string | null
  thumbnail_url?: string | null
  status: string
  published_at?: string | null
  created_at?: string | null
  users?: {
    id: number
    full_name: string
    email: string
  } | null
}

type ListResponse = {
  items: BlogRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
}

function formatDate(value?: string | null) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN')
}

function statusClass(status: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PUBLISHED') return 'blog-badge published'
  if (s === 'DRAFT') return 'blog-badge draft'
  if (s === 'ARCHIVED') return 'blog-badge archived'
  return 'blog-badge'
}

function statusLabel(status: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PUBLISHED') return 'Đã đăng'
  if (s === 'DRAFT') return 'Bản nháp'
  if (s === 'ARCHIVED') return 'Lưu trữ'
  return status || '--'
}

export default function BlogsPage() {
  const [items, setItems] = useState<BlogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')

  const [page, setPage] = useState(1)
  const limit = 10

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState<BlogRow | null>(null)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  function showToast(
    type: MessageType,
    message: string,
    title?: string,
    autoHide = true,
  ) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
    }))

    if (!autoHide) return
  }

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (keyword.trim()) params.set('search', keyword.trim())
    if (status) params.set('status', status)

    return params.toString()
  }, [page, limit, keyword, status])

  async function fetchBlogs(showLoading = true) {
    try {
      setError('')

      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const res = await fetch(`/admin/api/blogs?${queryString}`, {
        cache: 'no-store',
      })

      const data: ListResponse = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải danh sách blog')
      }

      const nextItems = Array.isArray(data.items) ? data.items : []
      const nextTotal = Number(data.total || 0)
      const nextTotalPages = Math.max(1, Number(data.totalPages || 1))

      setItems(nextItems)
      setTotal(nextTotal)
      setTotalPages(nextTotalPages)

      if (page > nextTotalPages) {
        setPage(nextTotalPages)
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi')
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBlogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  function openDeletePopup(blog: BlogRow) {
    setSelectedBlog(blog)
    setDeleteOpen(true)
  }

  function closeDeletePopup() {
    if (deleting) return
    setDeleteOpen(false)
    setSelectedBlog(null)
  }
  function handleRefreshPage() {
    setRefreshing(true)
    window.location.reload()
  }
  async function handleConfirmDelete() {
    if (!selectedBlog) return

    try {
      setDeleting(true)

      const res = await fetch(`/admin/api/blogs/${selectedBlog.id}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Xoá blog thất bại')
      }

      closeDeletePopup()

      showToast(
        'success',
        `Đã xóa blog "${selectedBlog.title}" thành công`,
        'Xóa thành công',
      )

      if (items.length === 1 && page > 1) {
        setPage((prev) => prev - 1)
      } else {
        await fetchBlogs(false)
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Xóa blog thất bại', 'Có lỗi xảy ra')
    } finally {
      setDeleting(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(searchInput.trim())
  }

  function handleReset() {
    setSearchInput('')
    setKeyword('')
    setStatus('')
    setPage(1)
  }

  return (
    <>
      <div className="blog-page">
        <div className="blog-head">
          <div>
            <div className="blog-title">Quản lý Bài viết</div>
          </div>

          <div className="blog-head-actions">
            <Link
              href="/admin/blogs/create"
              className="blog-btn blog-btn-primary"
            >
              + Tạo blog
            </Link>

            <button
              className="blog-btn"
              onClick={handleRefreshPage}
              disabled={refreshing}
            >
              {refreshing ? 'Đang làm mới...' : 'Làm mới'}
            </button>
          </div>
        </div>

        <div className="blog-card">
          <form className="blog-filters" onSubmit={handleSearchSubmit}>
            <div className="blog-field blog-field-grow">
              <label>Tìm kiếm</label>
              <input
                placeholder="Nhập tiêu đề, slug, mô tả ngắn..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="blog-field">
              <label>Trạng thái</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã đăng</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </div>

            <div className="blog-filter-actions">
              <button type="submit" className="blog-btn blog-btn-primary">
                Tìm kiếm
              </button>

              <button type="button" className="blog-btn" onClick={handleReset}>
                Đặt lại
              </button>
            </div>
          </form>
        </div>

        <div className="blog-card">
          <div className="blog-toolbar">
            <div className="blog-toolbar-total">
              Số lượng bài viết: <strong>{total}</strong>
            </div>

            <div className="blog-pagination-actions">
              <button
                className="blog-btn blog-btn-page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </button>

              <span className="blog-page-indicator">
                Trang {page} / {totalPages}
              </span>

              <button
                className="blog-btn blog-btn-page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        <div className="blog-card">
          {error ? <div className="blog-error">{error}</div> : null}

          {loading ? (
            <div className="blog-empty">Đang tải blog...</div>
          ) : items.length === 0 ? (
            <div className="blog-empty">Không có blog</div>
          ) : (
            <div className="blog-table-wrap">
              <table className="blog-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Bài viết</th>
                    <th>Tác giả</th>
                    <th>Trạng thái</th>
                    <th>Ngày đăng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="blog-id">#{item.id}</div>
                      </td>

                      <td>
                        <div className="blog-post">
                          <div className="blog-post-thumb">
                            {item.thumbnail_url ? (
                              <img
                                src={item.thumbnail_url}
                                alt={item.title}
                                className="blog-thumb-img"
                              />
                            ) : (
                              <div className="blog-thumb-placeholder">BLOG</div>
                            )}
                          </div>

                          <div className="blog-post-content">
                            <div className="blog-strong">{item.title}</div>
                            <div className="blog-slug">/{item.slug}</div>
                            <div className="blog-description">
                              {item.short_description || 'Không có mô tả ngắn'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="blog-cell">
                          <div className="blog-strong">
                            {item.users?.full_name || '--'}
                          </div>
                          <div className="blog-muted-sm">
                            {item.users?.email || '--'}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={statusClass(item.status)}>
                          {statusLabel(item.status)}
                        </span>
                      </td>

                      <td>
                        <div className="blog-date">
                          <div>{formatDate(item.published_at)}</div>
                          <div className="blog-muted-sm">
                            Tạo: {formatDate(item.created_at)}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="blog-actions">
                          <Link
                            href={`/admin/blogs/${item.id}`}
                            className="blog-link blog-link-view"
                          >
                            Chi tiết
                          </Link>

                          <button
                            type="button"
                            onClick={() => openDeletePopup(item)}
                            className="blog-link blog-link-delete"
                          >
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        open={deleteOpen}
        title="Xác nhận xóa blog"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa bài viết này?"
        itemName={selectedBlog?.title}
        loading={deleting}
        onClose={closeDeletePopup}
        onConfirm={handleConfirmDelete}
      />

      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        autoClose={4000}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
      />
    </>
  )
}
