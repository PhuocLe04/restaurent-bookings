'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

type TableTypeRow = {
  id: number
  name: string
  description?: string | null
  _count?: {
    restaurant_tables: number
  }
}

type ListResponse = {
  items: TableTypeRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function TableTypePage() {
  const [items, setItems] = useState<TableTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')

  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  async function fetchData(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)

      setError('')

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (keyword.trim()) params.set('q', keyword.trim())

      const res = await fetch(`/admin/api/table-type?${params.toString()}`, {
        cache: 'no-store',
      })
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách loại bàn')
      }

      setItems(json.items || [])
      setTotal(json.total || 0)
      setTotalPages(json.totalPages || 1)
    } catch (e: any) {
      setError(e?.message || 'Đã xảy ra lỗi')
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q)
  }

  async function handleDelete(id: number) {
    const ok = window.confirm('Bạn có chắc muốn xóa loại bàn này không?')
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/table-type/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.message || 'Xóa loại bàn thất bại')

      await fetchData(true)
    } catch (e: any) {
      alert(e?.message || 'Đã xảy ra lỗi')
    }
  }

  return (
    <div className="table-type-page">
      {/* Header */}
      <div className="table-type-head">
        <div>
          <h1 className="admin-title">Quản lý loại bàn</h1>
        </div>

        <div className="table-type-head-actions">
          <Link
            href="/admin/table-type/create"
            className="table-type-btn table-type-btn-primary"
          >
            + Thêm loại bàn
          </Link>
          <button
            type="button"
            className="table-type-btn table-type-btn-secondary"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span
              className={refreshing ? 'table-type-refresh-icon' : ''}
            ></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-type-toolbar">
        <form className="table-type-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả loại bàn..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="submit"
            className="table-type-btn table-type-btn-primary"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {error && <div className="table-type-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="table-type-card">
        <div className="table-type-table-wrap">
          <table className="table-type-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Tên loại bàn</th>
                <th>Mô tả</th>
                <th style={{ width: 130 }}>Số lượng bàn</th>
                <th style={{ width: 200 }}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="table-type-td-muted table-type-loading-shimmer"
                  >
                    Đang tải danh sách loại bàn...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-type-td-muted">
                    Không có dữ liệu loại bàn
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="table-type-strong">#{item.id}</span>
                    </td>
                    <td>
                      <div className="table-type-info">
                        <div className="table-type-details">
                          <span className="table-type-name">{item.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.description ? (
                        <span className="table-type-description">
                          {item.description}
                        </span>
                      ) : (
                        <span className="table-type-muted-sm">—</span>
                      )}
                    </td>
                    <td>
                      <span className="table-type-count">
                        {item._count?.restaurant_tables ?? 0} Bàn
                      </span>
                    </td>
                    <td>
                      <div className="table-type-actions-row">
                        <Link
                          href={`/admin/table-type/${item.id}`}
                          className="table-type-btn"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="table-type-btn table-type-btn-danger"
                          onClick={() => handleDelete(item.id)}
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

        {/* Card Footer */}
        {!loading && items.length > 0 && (
          <div className="table-type-card-foot">
            <div className="table-type-meta">
              <span>Tổng số {total} loại bàn</span>
              <span className="table-type-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="table-type-pagination">
              <button
                type="button"
                className="table-type-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="table-type-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="table-type-btn"
                disabled={page >= totalPages}
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
