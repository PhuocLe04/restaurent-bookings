'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

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

      const res = await fetch(`/admin/api/categories?${params.toString()}`, {
        cache: 'no-store',
      })

      const data: ListResponse = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Không thể tải danh sách')
      }

      const nextItems = Array.isArray(data.items) ? data.items : []
      const nextTotal = Number(data.total) || 0
      const nextPage = Number(data.page) || currentPage || 1
      const nextTotalPages = Math.max(1, Number(data.totalPages) || 1)

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
      setError(e.message || 'Đã có lỗi xảy ra')
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return

    try {
      const res = await fetch(`/admin/api/categories/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Xóa thất bại')
      }

      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await loadData(true)
      }
    } catch (e: any) {
      alert(e.message || 'Xóa thất bại')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q.trim())
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword])

  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1
  const toItem = total === 0 ? 0 : Math.min(page * limit, total)

  return (
    <div className="categories-page">
      <div className="categories-head">
        <div>
          <h1 className="admin-title">Quản lý danh mục món ăn</h1>
        </div>

        <div className="categories-head-actions">
          <Link
            href="/admin/categories/create"
            className="categories-btn categories-btn-primary"
          >
            + Thêm danh mục
          </Link>

          <button
            type="button"
            className="categories-btn categories-btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <span
              className={refreshing ? 'categories-refresh-icon' : ''}
            ></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      <div className="categories-toolbar">
        <form className="categories-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo tên danh mục..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="submit"
            className="categories-btn categories-btn-primary"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {error && <div className="categories-alert">⚠️ {error}</div>}

      <div className="categories-card">
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
                items.map((item) => (
                  <tr key={item.id}>
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
                        <Link
                          href={`/admin/categories/${item.id}`}
                          className="categories-btn"
                          title="Xem chi tiết"
                        >
                          Chi tiết
                        </Link>

                        <button
                          type="button"
                          className="categories-btn categories-btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa danh mục"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="categories-card-foot">
          <div className="categories-meta">
            <span>Tổng số {total} danh mục</span>
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
    </div>
  )
}
