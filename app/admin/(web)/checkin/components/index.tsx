'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import './index.css'

type ReservationRow = {
  id: number
  user_id: number
  reservation_time: string
  reservation_endtime: string
  number_of_guests: number
  status: string
  created_at: string | null
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
  reservation_tables?: Array<{
    table_id: number
    restaurant_tables?: {
      id: number
      table_name: string
      capacity: number
    } | null
  }>
  orders?: any[]
  payments?: any[]
}

type ListResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  data: ReservationRow[]
}

type ReservationFormValue = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  status: string
  table_ids: number[]
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SEATED', label: 'Đã đến' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'NO_SHOW', label: 'Không đến' },
]

function getStatusLabel(status: string) {
  switch (String(status).toUpperCase()) {
    case 'PENDING':
      return 'Chờ xác nhận'
    case 'CONFIRMED':
      return 'Đã xác nhận'
    case 'SEATED':
      return 'Đã đến'
    case 'COMPLETED':
      return 'Hoàn thành'
    case 'CANCELLED':
      return 'Đã hủy'
    case 'NO_SHOW':
      return 'Không đến'
    default:
      return status || 'Không rõ'
  }
}

function nowLocalDatetimeInputValue() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function todayInputValue() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseIds(text: string): number[] {
  return text
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function safeNumber(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function formatDateKey(dateString: string) {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return 'Không rõ ngày'
  return d.toLocaleDateString('vi-VN')
}

function groupReservationsByDate(rows: ReservationRow[]) {
  const grouped = new Map<string, ReservationRow[]>()

  for (const row of rows) {
    const key = formatDateKey(row.reservation_time)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  return Array.from(grouped.entries()).map(([date, items]) => ({
    date,
    items,
  }))
}

async function readApiError(res: Response) {
  const ct = res.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) {
      const j = await res.json()
      return j?.message || `Yêu cầu thất bại (HTTP ${res.status})`
    }
    const txt = await res.text()
    if (ct.includes('text/html') || txt.trim().startsWith('<!DOCTYPE html')) {
      return `API trả về HTML (có thể sai route, bị redirect hoặc thiếu quyền). HTTP ${res.status}`
    }
    return txt?.slice(0, 300) || `Yêu cầu thất bại (HTTP ${res.status})`
  } catch {
    return `Yêu cầu thất bại (HTTP ${res.status})`
  }
}

export default function ReservationsClient() {
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')

  const [filterMode, setFilterMode] = useState<'single' | 'range'>('single')
  const [date, setDate] = useState(todayInputValue())
  const [fromDate, setFromDate] = useState(todayInputValue())
  const [toDate, setToDate] = useState(todayInputValue())

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string>('')

  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const [createUserId, setCreateUserId] = useState<number>(0)
  const [createReservationTime, setCreateReservationTime] = useState(
    nowLocalDatetimeInputValue(),
  )
  const [createGuests, setCreateGuests] = useState<number>(1)
  const [createStatus, setCreateStatus] = useState<string>('PENDING')
  const [createTableIdsText, setCreateTableIdsText] = useState('')

  const query = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('limit', String(limit))

    if (status) sp.set('status', status)
    if (keyword.trim()) sp.set('name', keyword.trim())

    if (filterMode === 'single') {
      sp.set('date', date || todayInputValue())
    } else {
      if (fromDate) sp.set('from_date', fromDate)
      if (toDate) sp.set('to_date', toDate)
    }

    return sp.toString()
  }, [page, limit, status, keyword, filterMode, date, fromDate, toDate])

  const groupedRows = useMemo(() => {
    if (filterMode === 'single') {
      const onlyDate = formatDateKey(date || todayInputValue())
      const filtered = rows.filter(
        (r) => formatDateKey(r.reservation_time) === onlyDate,
      )
      return filtered.length ? [{ date: onlyDate, items: filtered }] : []
    }

    return groupReservationsByDate(rows)
  }, [rows, filterMode, date])

  const load = async () => {
    try {
      setError('')
      setLoading(true)

      const res = await fetch(`/admin/api/reservation?${query}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const msg = await readApiError(res)
        throw new Error(msg)
      }

      const data = (await res.json()) as ListResponse
      setRows(data.data ?? [])
      setTotalPages(data.totalPages ?? 1)
    } catch (e: any) {
      setError(String(e?.message ?? e))
      setRows([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const resetCreateForm = () => {
    setCreateUserId(0)
    setCreateReservationTime(nowLocalDatetimeInputValue())
    setCreateGuests(1)
    setCreateStatus('PENDING')
    setCreateTableIdsText('')
  }

  const handleCreate = async (value: ReservationFormValue) => {
    try {
      setCreating(true)
      const res = await fetch('/admin/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      })
      if (!res.ok) throw new Error(await readApiError(res))
      setOpenCreate(false)
      resetCreateForm()
      setPage(1)
      await load()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    } finally {
      setCreating(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: ReservationFormValue = {
      user_id: safeNumber(createUserId),
      reservation_time: createReservationTime,
      number_of_guests: safeNumber(createGuests, 1),
      status: createStatus,
      table_ids: parseIds(createTableIdsText),
    }

    await handleCreate(payload)
  }

  const handleAttendance = async (
    id: number,
    nextStatus: 'SEATED' | 'NO_SHOW',
  ) => {
    try {
      setUpdatingId(id)

      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        throw new Error(await readApiError(res))
      }

      await load()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="checkin-page">
      <div className="checkin-head">
        <div>
          <h1 className="admin-title">Check In</h1>
        </div>

        <div className="checkin-head-actions">
          <button
            className="checkin-btn checkin-primary"
            onClick={load}
            type="button"
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className="checkin-filters">
        <div className="checkin-filters-row checkin-filters-row--top">
          <div className="checkin-field">
            <label>Trạng thái</label>
            <select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value || 'ALL'} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="checkin-field">
            <label>Tìm theo tên</label>
            <input
              value={keyword}
              onChange={(e) => {
                setPage(1)
                setKeyword(e.target.value)
              }}
              placeholder="Nhập tên người đặt"
            />
          </div>

          <div className="checkin-field">
            <label>Kiểu lọc ngày</label>
            <div className="checkin-toggle">
              <button
                type="button"
                className={`checkin-btn ${filterMode === 'single' ? 'checkin-primary' : ''}`}
                onClick={() => {
                  setPage(1)
                  setFilterMode('single')
                }}
              >
                Một ngày
              </button>

              <button
                type="button"
                className={`checkin-btn ${filterMode === 'range' ? 'checkin-primary' : ''}`}
                onClick={() => {
                  setPage(1)
                  setFilterMode('range')
                }}
              >
                Khoảng ngày
              </button>
            </div>
          </div>

          {filterMode === 'single' ? (
            <div className="checkin-field">
              <label>Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setPage(1)
                  setDate(e.target.value || todayInputValue())
                }}
              />
            </div>
          ) : (
            <>
              <div className="checkin-field">
                <label>Từ ngày</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setPage(1)
                    setFromDate(e.target.value)
                  }}
                />
              </div>

              <div className="checkin-field">
                <label>Đến ngày</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setPage(1)
                    setToDate(e.target.value)
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="checkin-filters-row checkin-filters-row--bottom">
          <div className="checkin-pagination">
            <button
              className="checkin-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              type="button"
            >
              Trước
            </button>

            <div className="checkin-page-indicator">
              Trang <b>{page}</b> / {totalPages}
            </div>

            <button
              className="checkin-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="checkin-alert">
          <div className="checkin-alert-title">Lỗi</div>
          <div className="checkin-alert-msg">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="checkin-card">
          <div className="checkin-td-muted">Đang tải...</div>
        </div>
      ) : groupedRows.length === 0 ? (
        <div className="checkin-card">
          <div className="checkin-td-muted">Không có dữ liệu</div>
        </div>
      ) : (
        groupedRows.map((group) => (
          <div className="checkin-card" key={group.date}>
            <div className="checkin-group-title">Ngày {group.date}</div>

            <div className="checkin-table-wrap">
              <table className="checkin-table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>ID</th>
                    <th style={{ width: 150 }}>Người đặt</th>
                    <th style={{ width: 150 }}>Thời gian</th>
                    <th style={{ width: 50 }}>Số khách</th>
                    <th style={{ width: 70 }}>Trạng thái</th>
                    <th style={{ width: 70 }}>Bàn</th>
                    <th style={{ width: 220 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((r) => {
                    const tables =
                      r.reservation_tables?.map(
                        (x) => x.restaurant_tables?.table_name || x.table_id,
                      ) ?? []

                    return (
                      <tr key={r.id}>
                        <td>#{r.id}</td>

                        <td>
                          <div className="checkin-cell">
                            <div className="checkin-strong">
                              {r.users?.full_name || `Người dùng #${r.user_id}`}
                            </div>
                            <div className="checkin-muted-sm">
                              {r.users?.email || ''}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="checkin-cell">
                            <div className="checkin-strong">
                              {new Date(r.reservation_time).toLocaleString(
                                'vi-VN',
                              )}
                            </div>
                            <div className="checkin-muted-sm">
                              dự kiến kết thúc:
                              <br />
                              {new Date(r.reservation_endtime).toLocaleString(
                                'vi-VN',
                              )}
                            </div>
                          </div>
                        </td>

                        <td>{r.number_of_guests}</td>

                        <td>
                          <span
                            className={`checkin-badge checkin-badge-${r.status}`}
                          >
                            {getStatusLabel(r.status)}
                          </span>
                        </td>

                        <td className="checkin-muted-sm">
                          {tables.join(', ') || '—'}
                        </td>

                        <td>
                          <div className="checkin-actions-row">
                            <Link
                              className="checkin-btn"
                              href={`/admin/reservations/${r.id}`}
                            >
                              Chi tiết
                            </Link>

                            <button
                              className="checkin-btn checkin-primary"
                              disabled={updatingId === r.id}
                              onClick={() => handleAttendance(r.id, 'SEATED')}
                              type="button"
                            >
                              Đã đến
                            </button>

                            <button
                              className="checkin-btn checkin-danger"
                              disabled={updatingId === r.id}
                              onClick={() => handleAttendance(r.id, 'NO_SHOW')}
                              type="button"
                            >
                              Không đến
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
