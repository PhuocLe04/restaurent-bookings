'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../page.css'

type StaffRow = {
  id: number
  full_name: string
  role: string
  phone: string | null
  is_active: boolean | null
  user_id: number
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
    avatar?: string | null
    created_at?: string | null
  } | null
  shifts?: Array<{
    id: number
    start_time: string
    end_time: string
  }>
}

type ListResponse = {
  items: StaffRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function StaffPage() {
  const [items, setItems] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [keyword, setKeyword] = useState('')
  const [isActive, setIsActive] = useState('all')

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
      if (keyword.trim()) params.set('q', keyword.trim())
      if (isActive !== 'all') params.set('is_active', isActive)

      const res = await fetch(`/admin/api/staff?${params.toString()}`, {
        cache: 'no-store',
      })
      const json: ListResponse & { message?: string } = await res.json()

      if (!res.ok)
        throw new Error(json.message || 'Không thể tải danh sách nhân viên')

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
  }, [page, keyword, isActive])

  async function handleDelete(id: number) {
    const ok = window.confirm('Bạn có chắc muốn xóa nhân viên này không?')
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/staff/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.message || 'Xóa nhân viên thất bại')

      await fetchData(true)
    } catch (e: any) {
      alert(e?.message || 'Đã xảy ra lỗi')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setKeyword(q)
  }

  const getRoleBadgeClass = (role: string) => {
    if (role === 'admin') return 'staff-badge-admin'
    return 'staff-badge-staff'
  }

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Quản trị viên'
    if (role === 'staff') return 'Nhân viên'
    return role
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      time: date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: date.toLocaleDateString('vi-VN'),
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-head">
        <div>
          <h1 className="admin-title">Quản lý nhân viên</h1>
        </div>

        <div className="staff-head-actions">
          <Link
            href="/admin/staff/create"
            className="staff-btn staff-btn-primary"
          >
            + Thêm nhân viên
          </Link>

          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <span className={refreshing ? 'staff-refresh-icon' : ''}></span>
            {refreshing ? ' Đang làm mới...' : ' Làm mới'}
          </button>
        </div>
      </div>

      <div className="staff-toolbar">
        <form className="staff-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="staff-btn staff-btn-primary">
            Tìm kiếm
          </button>
        </form>

        <div className="staff-filters">
          <select
            value={isActive}
            onChange={(e) => {
              setPage(1)
              setIsActive(e.target.value)
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>
        </div>
      </div>

      {error && <div className="staff-alert">⚠️ {error}</div>}

      <div className="staff-card">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th style={{ width: 200 }}>Nhân viên</th>
                <th style={{ width: 150 }}>Vai trò</th>
                <th style={{ width: 120 }}>Số điện thoại</th>
                <th style={{ width: 220 }}>Ca làm gần nhất</th>
                <th style={{ width: 130 }}>Trạng thái</th>
                <th className="actions-col">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="staff-td-muted staff-loading-shimmer"
                  >
                    Đang tải danh sách nhân viên...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="staff-td-muted">
                    Không tìm thấy nhân viên nào
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const latestShift = item.shifts?.[0]
                  const startFormatted = latestShift
                    ? formatDateTime(latestShift.start_time)
                    : null
                  const endFormatted = latestShift
                    ? formatDateTime(latestShift.end_time)
                    : null

                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="staff-strong">#{item.id}</span>
                      </td>
                      <td>
                        <div className="staff-info">
                          <div className="staff-avatar">
                            {item.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="staff-details">
                            <span className="staff-name">{item.full_name}</span>
                            {item.users?.email && (
                              <span className="staff-email">
                                {item.users.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`staff-badge ${getRoleBadgeClass(item.role)}`}
                        >
                          {getRoleLabel(item.role)}
                        </span>
                      </td>
                      <td>{item.phone || '—'}</td>
                      <td>
                        {latestShift ? (
                          <div className="staff-shift">
                            <span className="staff-shift-time">
                              {startFormatted?.time} - {endFormatted?.time}
                            </span>
                            <span className="staff-shift-date">
                              {startFormatted?.date}
                            </span>
                          </div>
                        ) : (
                          'Chưa có ca làm việc'
                        )}
                      </td>
                      <td>
                        <span
                          className={`staff-badge ${item.is_active === false ? 'staff-badge-inactive' : 'staff-badge-active'}`}
                        >
                          {item.is_active === false ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td>
                        <div className="staff-actions-row">
                          <Link
                            href={`/admin/staff/${item.id}`}
                            className="staff-btn"
                          >
                            Chi tiết
                          </Link>
                          <button
                            type="button"
                            className="staff-btn staff-btn-danger"
                            onClick={() => handleDelete(item.id)}
                            disabled={item.role === 'admin'}
                            title={
                              item.role === 'admin'
                                ? 'Không thể xóa quản trị viên'
                                : ''
                            }
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && items.length > 0 && (
          <div className="staff-card-foot">
            <div className="staff-meta">
              <span>Tổng số {total} nhân viên</span>
              <span className="staff-meta-dot" />
              <span>
                Trang {page} / {totalPages}
              </span>
            </div>

            <div className="staff-pagination">
              <button
                type="button"
                className="staff-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trước
              </button>

              <div className="staff-page-indicator">
                <b>{page}</b> / {totalPages}
              </div>

              <button
                type="button"
                className="staff-btn"
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
