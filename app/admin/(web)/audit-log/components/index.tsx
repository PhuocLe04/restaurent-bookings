'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import './index.css'

type AuditLogRow = {
  id: number
  entity?: string | null
  entity_id?: number | null
  action?: string | null
  description?: string | null
  created_at?: string | null
  user_id: number
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
}

type ListResponse = {
  items: AuditLogRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  message?: string
}

function formatDate(value?: string | null) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN')
}

function actionClass(action?: string | null) {
  const a = (action || '').toUpperCase()
  if (a === 'CREATE') return 'audit-badge audit-badge-create'
  if (a === 'UPDATE') return 'audit-badge audit-badge-update'
  if (a === 'DELETE') return 'audit-badge audit-badge-delete'
  if (a === 'LOGIN') return 'audit-badge audit-badge-login'
  if (a === 'LOGOUT') return 'audit-badge audit-badge-logout'
  return 'audit-badge'
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [keyword, setKeyword] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')

  const [page, setPage] = useState(1)
  const limit = 10
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (keyword.trim()) params.set('keyword', keyword.trim())
    if (entity) params.set('entity', entity)
    if (action) params.set('action', action)

    return params.toString()
  }, [page, keyword, entity, action])

  async function fetchAuditLogs(showLoading = true) {
    try {
      setError('')
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      const res = await fetch(`/admin/api/audit-log?${queryString}`, {
        cache: 'no-store',
      })

      const data: ListResponse = await res.json()

      if (!res.ok) {
        throw new Error(
          data?.message || 'Không thể tải danh sách nhật ký hệ thống',
        )
      }

      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(Number(data.total || 0))
      setTotalPages(Number(data.totalPages || 1))
    } catch (err: any) {
      setError(
        err?.message || 'Đã xảy ra lỗi khi tải danh sách nhật ký hệ thống',
      )
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  async function handleDelete(id: number) {
    const ok = window.confirm(`Bạn có chắc muốn xoá audit log #${id} không?`)
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/audit-log/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Xoá audit log thất bại')
      }

      await fetchAuditLogs(false)
    } catch (err: any) {
      alert(err?.message || 'Xoá audit log thất bại')
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchAuditLogs(true)
  }

  function handleResetFilter() {
    setKeyword('')
    setEntity('')
    setAction('')
    setPage(1)
  }

  return (
    <div className="audit-page">
      <div className="audit-head">
        <div>
          <div className="audit-title">Nhật ký hệ thống</div>
        </div>

        <div className="audit-head-actions">
          <button
            className="audit-btn"
            onClick={() => fetchAuditLogs(false)}
            disabled={refreshing}
          >
            {refreshing ? 'Đang làm mới...' : 'Làm mới'}
          </button>
        </div>
      </div>

      <div className="audit-card">
        <form className="audit-filters" onSubmit={handleSearchSubmit}>
          <div className="audit-filters-row audit-filters-row-top">
            <div className="audit-field audit-field-grow">
              <label>Tìm kiếm</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên người dùng, email..."
              />
            </div>

            <div className="audit-field">
              <label>Entity</label>
              <select
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="users">users</option>
                <option value="reservations">reservations</option>
                <option value="orders">orders</option>
                <option value="payments">payments</option>
                <option value="staff">staff</option>
                <option value="blogs">blogs</option>
                <option value="membership">membership</option>
                <option value="services">services</option>
                <option value="menu_items">menu_items</option>
              </select>
            </div>

            <div className="audit-field">
              <label>Action</label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Tất cả</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
              </select>
            </div>
          </div>

          <div className="audit-filters-row audit-filters-row-bottom">
            <div className="audit-filter-actions">
              <button type="submit" className="audit-btn audit-btn-primary">
                Tìm kiếm
              </button>
              <button
                type="button"
                className="audit-btn"
                onClick={handleResetFilter}
              >
                Đặt lại
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="audit-card">
        <div className="audit-bottom-bar">
          <div className="audit-total">
            Tổng số log: <strong>{total}</strong>
          </div>

          <div className="audit-pagination">
            <button
              className="audit-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>

            <span className="audit-page-indicator">
              Trang {page} / {totalPages}
            </span>

            <button
              className="audit-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="audit-card">
        {error ? (
          <div className="audit-alert">
            <div className="audit-alert-title">Có lỗi xảy ra</div>
            <div className="audit-alert-msg">{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="audit-empty">
            Đang tải danh sách nhật ký hệ thống...
          </div>
        ) : items.length === 0 ? (
          <div className="audit-empty">Không có audit log nào</div>
        ) : (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Người thực hiện</th>
                  <th>Entity</th>
                  <th>Action</th>
                  {/* <th>Mô tả</th> */}
                  <th>Thời gian</th>
                  {/* <th>Thao tác</th> */}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="audit-cell">
                        <div className="audit-strong">#{item.id}</div>
                      </div>
                    </td>

                    <td>
                      <div className="audit-cell">
                        <div className="audit-strong">
                          {item.users?.full_name || `User #${item.user_id}`}
                        </div>
                        <div className="audit-muted-sm">
                          {item.users?.email || '--'}
                        </div>
                        <div className="audit-muted-sm">
                          {item.users?.phone || '--'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="audit-cell">
                        <div className="audit-strong">
                          {item.entity || '--'}
                        </div>
                        <div className="audit-muted-sm">
                          Entity ID: {item.entity_id ?? '--'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={actionClass(item.action)}>
                        {item.action || '--'}
                      </span>
                    </td>
                    {/* 
                    <td>
                      <div className="audit-cell">
                        <div className="audit-description">
                          {item.description || '--'}
                        </div>
                      </div>
                    </td> */}

                    <td>
                      <div className="audit-cell">
                        <div className="audit-muted-sm">
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </td>
                    {/* 
                    <td>
                      <div className="audit-actions-row">
                        <Link
                          href={`/admin/audit-logs/${item.id}`}
                          className="audit-link"
                        >
                          Xem
                        </Link>

                        <button
                          className="audit-link audit-link-danger"
                          onClick={() => handleDelete(item.id)}
                        >
                          Xoá
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
