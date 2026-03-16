'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

type RestaurantTableRow = {
  id: number
  table_name: string
  capacity: number
  is_active: boolean | null
  table_type_id: number
  table_types?: {
    id: number
    name: string
    description?: string | null
  } | null
}

type TableTypeOption = {
  id: number
  name: string
}

type ListResponse = {
  items: RestaurantTableRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function RestaurantTablePage() {
  const [items, setItems] = useState<RestaurantTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [tableTypeId, setTableTypeId] = useState('')
  const [isActive, setIsActive] = useState('all')

  const [tableTypes, setTableTypes] = useState<TableTypeOption[]>([])

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  async function loadTableTypes() {
    try {
      const res = await fetch('/admin/api/table-type?page=1&limit=100', {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) return
      setTableTypes(json.items || [])
    } catch (e) {
      console.error(e)
    }
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
      if (tableTypeId) params.set('table_type_id', tableTypeId)
      if (isActive !== 'all') params.set('is_active', isActive)

      const res = await fetch(
        `/admin/api/restaurant-table?${params.toString()}`,
        {
          cache: 'no-store',
        },
      )
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách bàn')
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
    loadTableTypes()
  }, [])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword, tableTypeId, isActive])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q)
  }

  async function handleDelete(id: number) {
    const ok = window.confirm('Bạn có chắc muốn xóa bàn này không?')
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/restaurant-table/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.message || 'Xóa bàn thất bại')

      await fetchData(true)
    } catch (e: any) {
      alert(e?.message || 'Đã xảy ra lỗi')
    }
  }

  return (
    <div className="restaurant-table-page">
      {/* Header */}
      <div className="restaurant-table-head">
        <div>
          <h1 className="admin-title">Quản lý bàn nhà hàng</h1>
        </div>

        <div className="restaurant-table-head-actions">
          <Link
            href="/admin/restaurant-table/create"
            className="restaurant-table-btn restaurant-table-btn-primary"
          >
            + Thêm bàn
          </Link>
          <button
            type="button"
            className="restaurant-table-btn restaurant-table-btn-secondary"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span
              className={refreshing ? 'restaurant-table-refresh-icon' : ''}
            ></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="restaurant-table-toolbar">
        <form className="restaurant-table-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo tên bàn..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="submit"
            className="restaurant-table-btn restaurant-table-btn-primary"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="restaurant-table-filters">
          <select
            value={tableTypeId}
            onChange={(e) => {
              setPage(1)
              setTableTypeId(e.target.value)
            }}
          >
            <option value="">Tất cả loại bàn</option>
            {tableTypes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="restaurant-table-filters">
          <select
            value={isActive}
            onChange={(e) => {
              setPage(1)
              setIsActive(e.target.value)
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngưng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && <div className="restaurant-table-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="restaurant-table-card">
        <div className="restaurant-table-wrap">
          <table className="restaurant-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Tên bàn</th>
                <th style={{ width: 120 }}>Sức chứa</th>
                <th>Loại bàn</th>
                <th style={{ width: 140 }}>Trạng thái</th>
                <th style={{ width: 200 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="restaurant-table-td-muted restaurant-table-loading-shimmer"
                  >
                    Đang tải danh sách bàn...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="restaurant-table-td-muted">
                    Không có dữ liệu bàn
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="restaurant-table-strong">
                        #{item.id}
                      </span>
                    </td>
                    <td>
                      <div className="restaurant-table-info">
                        <div className="restaurant-table-details">
                          <span className="restaurant-table-name">
                            {item.table_name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="restaurant-table-capacity">
                        {item.capacity} Người
                      </span>
                    </td>
                    <td>
                      {item.table_types ? (
                        <div className="restaurant-table-details">
                          <span className="restaurant-table-name">
                            {item.table_types.name}
                          </span>
                          {item.table_types.description && (
                            <span className="restaurant-table-type">
                              {item.table_types.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="restaurant-table-muted-sm">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`restaurant-table-badge ${
                          item.is_active === false
                            ? 'restaurant-table-badge-inactive'
                            : 'restaurant-table-badge-active'
                        }`}
                      >
                        {item.is_active === false
                          ? 'Ngưng hoạt động'
                          : 'Hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="restaurant-table-actions-row">
                        <Link
                          href={`/admin/restaurant-table/${item.id}`}
                          className="restaurant-table-btn"
                          title="Xem chi tiết"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="restaurant-table-btn restaurant-table-btn-danger"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa bàn"
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
          <div className="restaurant-table-card-foot">
            <div className="restaurant-table-meta">
              <span>Tổng số {total} bàn</span>
              <span className="restaurant-table-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="restaurant-table-pagination">
              <button
                type="button"
                className="restaurant-table-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="restaurant-table-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="restaurant-table-btn"
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
