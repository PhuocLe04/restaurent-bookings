'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

type ReservationTableRow = {
  reservation_id: number
  table_id: number
  user: {
    id: number
    full_name: string
    email: string
    phone: string
  } | null
  reservation: {
    time: string
    end_time: string
    number_of_guests: number
    status: string
  }
  table: {
    id: number
    table_name: string
    capacity: number
    is_active: boolean | null
    table_type: {
      id: number
      name: string
      description?: string | null
    } | null
  }
  display_text: string
}

type ListResponse = {
  items: ReservationTableRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function formatDateTime(value: string) {
  const d = new Date(value)
  return {
    date: d.toLocaleDateString('vi-VN'),
    time: d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function getStatusClass(status: string) {
  if (status === 'CONFIRMED') return 'reservation-badge-active'
  if (status === 'COMPLETED') return 'reservation-badge-admin'
  if (status === 'CANCELLED') return 'reservation-badge-inactive'
  return 'reservation-badge-staff'
}

function getStatusText(status: string) {
  switch (status) {
    case 'PENDING':
      return 'Chờ xác nhận'
    case 'CONFIRMED':
      return 'Đã xác nhận'
    case 'COMPLETED':
      return 'Hoàn thành'
    case 'CANCELLED':
      return 'Đã hủy'
    default:
      return status
  }
}

export default function ReservationTablePage() {
  const [items, setItems] = useState<ReservationTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

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
      if (status) params.set('status', status)
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(
        `/admin/api/reservation-table?${params.toString()}`,
        {
          cache: 'no-store',
        },
      )
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok) {
        throw new Error(json.message || 'Không thể tải danh sách bàn đã đặt')
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
  }, [page, keyword, status, from, to])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q)
  }

  function handleClearFilters() {
    setQ('')
    setKeyword('')
    setStatus('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <div className="reservation-page">
      {/* Header */}
      <div className="reservation-head">
        <div>
          <h1 className="reservation-h1">Quản lý bàn đã đặt</h1>
          <p className="reservation-muted">
            Tổng số bản ghi: <span className="reservation-strong">{total}</span>
          </p>
        </div>

        <div className="reservation-head-actions">
          <button
            type="button"
            className="reservation-btn reservation-btn-secondary"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? 'reservation-refresh-icon' : ''}>
              ↻
            </span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>

          <button
            type="button"
            className="reservation-btn reservation-btn-primary"
            onClick={handleClearFilters}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="reservation-toolbar">
        <form className="reservation-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo người đặt, bàn, loại bàn..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="submit"
            className="reservation-btn reservation-btn-primary"
          >
            Tìm kiếm
          </button>
        </form>

        <div className="reservation-filters">
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING - Chờ xác nhận</option>
            <option value="CONFIRMED">CONFIRMED - Đã xác nhận</option>
            <option value="COMPLETED">COMPLETED - Hoàn thành</option>
            <option value="CANCELLED">CANCELLED - Đã hủy</option>
          </select>
        </div>

        <div className="reservation-filters">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1)
              setFrom(e.target.value)
            }}
            placeholder="Từ ngày"
          />
        </div>

        <div className="reservation-filters">
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1)
              setTo(e.target.value)
            }}
            placeholder="Đến ngày"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && <div className="reservation-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="reservation-card">
        <div className="reservation-table-wrap">
          <table className="reservation-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Id</th>
                <th style={{ width: 220 }}>Người đặt</th>
                <th style={{ width: 200 }}>Thời gian</th>
                <th style={{ width: 150 }}>Bàn</th>
                <th style={{ width: 130 }}>Loại bàn</th>
                <th style={{ width: 90 }}>Số khách</th>
                <th style={{ width: 130 }}>Trạng thái</th>
                <th style={{ width: 100 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="reservation-td-muted reservation-loading-shimmer"
                  >
                    Đang tải danh sách bàn đã đặt...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="reservation-td-muted">
                    Không có dữ liệu bàn đã đặt
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const start = formatDateTime(item.reservation.time)
                  const end = formatDateTime(item.reservation.end_time)

                  return (
                    <tr key={`${item.reservation_id}-${item.table_id}`}>
                      <td>
                        <span className="reservation-strong">
                          #{item.reservation_id}
                        </span>
                      </td>
                      <td>
                        {item.user ? (
                          <div className="reservation-user-info">
                            <span className="reservation-user-name">
                              {item.user.full_name}
                            </span>
                            <span className="reservation-user-email">
                              {item.user.email}
                            </span>
                            {item.user.phone && (
                              <span className="reservation-user-email">
                                {item.user.phone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="reservation-muted-sm">Không rõ</span>
                        )}
                      </td>
                      <td>
                        <div className="reservation-time">
                          <span className="reservation-time-range">
                            {start.time} - {end.time}
                          </span>
                          <span className="reservation-time-date">
                            {start.date}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="reservation-table-info">
                          <span className="reservation-table-name">
                            {item.table.table_name}
                          </span>
                          <span className="reservation-table-capacity">
                            Sức chứa: {item.table.capacity} người
                          </span>
                        </div>
                      </td>
                      <td>
                        {item.table.table_type?.name || (
                          <span className="reservation-muted-sm">—</span>
                        )}
                      </td>
                      <td>
                        <span className="reservation-strong">
                          {item.reservation.number_of_guests}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`reservation-badge ${getStatusClass(item.reservation.status)}`}
                        >
                          {getStatusText(item.reservation.status)}
                        </span>
                      </td>
                      <td>
                        <div className="reservation-actions-row">
                          <Link
                            href={`/admin/reservation/${item.reservation_id}`}
                            className="reservation-btn"
                            title="Xem chi tiết reservation"
                          >
                            Chi tiết
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer */}
        {!loading && items.length > 0 && (
          <div className="reservation-card-foot">
            <div className="reservation-meta">
              <span>Tổng số {total} bản ghi</span>
              <span className="reservation-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="reservation-pagination">
              <button
                type="button"
                className="reservation-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="reservation-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="reservation-btn"
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
