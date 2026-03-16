'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
}

export default function ShiftsPage() {
  const [items, setItems] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [staffId, setStaffId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
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
      if (staffId.trim()) params.set('staff_id', staffId.trim())
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const res = await fetch(`/admin/api/shifts?${params.toString()}`, {
        cache: 'no-store',
      })
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok)
        throw new Error(json.message || 'Không thể tải danh sách ca làm')

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
  }, [page])

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  function handleClearFilter() {
    setStaffId('')
    setFrom('')
    setTo('')
    setPage(1)
    setTimeout(() => fetchData(), 0)
  }

  async function handleDelete(id: number) {
    const ok = window.confirm('Bạn có chắc muốn xóa ca làm này không?')
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/shifts/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.message || 'Xóa ca làm thất bại')

      await fetchData(true)
    } catch (e: any) {
      alert(e?.message || 'Đã xảy ra lỗi')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffHours =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    return `${diffHours.toFixed(1)} giờ`
  }

  const getRoleBadgeClass = (role: string) => {
    if (role === 'admin') return 'shift-badge-admin'
    return 'shift-badge-staff'
  }

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Quản trị viên'
    if (role === 'staff') return 'Nhân viên'
    return role
  }

  return (
    <div className="shift-page">
      {/* Header */}
      <div className="shift-head">
        <div>
          <h1 className="admin-title">Quản lý ca làm</h1>
        </div>

        <div className="shift-head-actions">
          <Link
            href="/admin/shifts/create"
            className="shift-btn shift-btn-primary"
          >
            + Thêm ca làm
          </Link>
          <button
            type="button"
            className="shift-btn shift-btn-secondary"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? 'shift-refresh-icon' : ''}></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form className="shift-toolbar" onSubmit={handleFilter}>
        <input
          type="number"
          min="1"
          placeholder="ID nhân viên"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
        />

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Từ ngày"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Đến ngày"
        />

        <button type="submit" className="shift-btn shift-btn-primary">
          Lọc
        </button>

        <button
          type="button"
          className="shift-btn shift-btn-secondary"
          onClick={handleClearFilter}
        >
          Xóa lọc
        </button>
      </form>

      {/* Error Alert */}
      {error && <div className="shift-alert">⚠️ {error}</div>}

      {/* Table Card */}
      <div className="shift-card">
        <div className="shift-table-wrap">
          <table className="shift-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th style={{ width: 200 }}>Nhân viên</th>
                <th style={{ width: 140 }}>Vai trò</th>
                <th style={{ width: 220 }}>Thời gian</th>
                <th style={{ width: 140 }}>Trạng thái</th>
                <th className="actions-col">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="shift-td-muted shift-loading-shimmer"
                  >
                    Đang tải danh sách ca làm...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="shift-td-muted">
                    Không tìm thấy ca làm nào
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="shift-strong">#{item.id}</span>
                    </td>
                    <td>
                      {item.staff ? (
                        <div className="shift-info">
                          <div className="shift-avatar">
                            {item.staff.full_name?.charAt(0)?.toUpperCase() ||
                              '?'}
                          </div>
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
                    </td>
                    <td>
                      {item.staff ? (
                        <span
                          className={`shift-badge ${getRoleBadgeClass(item.staff.role)}`}
                        >
                          {getRoleLabel(item.staff.role)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
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
                    </td>
                    <td>
                      {item.staff ? (
                        <span
                          className={`shift-badge ${item.staff.is_active === false ? 'shift-badge-inactive' : 'shift-badge-active'}`}
                        >
                          {item.staff.is_active === false
                            ? 'Đã khóa'
                            : 'Hoạt động'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div className="shift-actions-row">
                        <Link
                          href={`/admin/shifts/${item.id}`}
                          className="shift-btn"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="shift-btn shift-btn-danger"
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
          <div className="shift-card-foot">
            <div className="shift-meta">
              <span>Tổng số {total} ca làm</span>
              <span className="shift-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="shift-pagination">
              <button
                type="button"
                className="shift-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="shift-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="shift-btn"
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
