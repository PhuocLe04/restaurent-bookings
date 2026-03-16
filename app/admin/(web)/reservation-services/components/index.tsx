'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q.trim())
  }

  async function handleDelete(id: number) {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này không?')) return

    try {
      const res = await fetch(`/admin/api/reservation-services/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Xóa dịch vụ thất bại')
      }

      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        await loadData(true)
      }
    } catch (e: any) {
      alert(e.message || 'Đã xảy ra lỗi')
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
    <div className="services-page">
      {/* Header */}
      <div className="services-head">
        <div>
          <h1 className="admin-title">Quản lý dịch vụ</h1>
        </div>

        <div className="services-head-actions">
          <Link
            href="/admin/reservation-services/create"
            className="services-btn services-btn-primary"
          >
            + Thêm dịch vụ
          </Link>
          <button
            type="button"
            className="services-btn services-btn-secondary"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? 'services-refresh-icon' : ''}></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="services-toolbar">
        <form className="services-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo tên dịch vụ..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="services-btn services-btn-primary">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && <div className="services-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="services-card">
        <div className="services-table-wrap">
          <table className="services-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th style={{ width: 90 }}>Ảnh</th>
                <th style={{ width: 120 }}>Tên dịch vụ</th>
                <th style={{ width: 150 }}>Mô tả</th>
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
                items.map((item) => (
                  <tr key={item.id}>
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
                        {item.is_active ? 'Hoạt động' : 'Ngưng'}
                      </span>
                    </td>

                    <td>
                      <div className="services-actions-row">
                        <Link
                          href={`/admin/reservation-services/${item.id}`}
                          className="services-btn"
                          title="Xem chi tiết"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="services-btn services-btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa dịch vụ"
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

        {/* Card Footer với Pagination */}
        {!loading && items.length > 0 && (
          <div className="services-card-foot">
            <div className="services-meta">
              <span>Tổng số {total} dịch vụ</span>
              <span className="services-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="services-pagination">
              <button
                type="button"
                className="services-btn"
                disabled={page <= 1 || loading || refreshing}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="services-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="services-btn"
                disabled={page >= totalPages || loading || refreshing}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
