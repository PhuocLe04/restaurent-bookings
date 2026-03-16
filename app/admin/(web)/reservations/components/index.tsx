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
  reservation_services?: Array<{
    service_id: number
    quantity: number
    unit_price: any
    services?: { id: number; name: string; price: any } | null
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
  services: Array<{
    service_id: number
    quantity: number
    unit_price?: number
  }>
}

type ServiceInput = {
  service_id: number
  service_name?: string
  quantity: number
  unit_price?: number
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

const FORM_STATUS_OPTIONS = STATUS_OPTIONS.filter((x) => x.value !== '')

function getStatusLabel(status: string) {
  switch (status) {
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
    case 'pending':
      return 'Chờ xác nhận'
    case 'confirmed':
      return 'Đã xác nhận'
    case 'seated':
      return 'Đã đến'
    case 'completed':
      return 'Hoàn thành'
    case 'cancelled':
      return 'Đã hủy'
    case 'no_show':
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
  const [limit] = useState(5)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string>('')

  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const [createUserId, setCreateUserId] = useState<number>(0)
  const [createReservationTime, setCreateReservationTime] = useState(
    nowLocalDatetimeInputValue(),
  )
  const [createGuests, setCreateGuests] = useState<number>(1)
  const [createStatus, setCreateStatus] = useState<string>('PENDING')
  const [createTableIdsText, setCreateTableIdsText] = useState('')
  const [createServices, setCreateServices] = useState<ServiceInput[]>([])

  const query = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('limit', String(limit))
    if (status) sp.set('status', status)
    if (keyword.trim()) sp.set('name', keyword.trim())
    return sp.toString()
  }, [page, limit, status, keyword])

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
    setCreateServices([])
  }

  const handleDelete = async (id: number) => {
    const ok = confirm(`Bạn có chắc muốn xóa đặt bàn #${id} không?`)
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await readApiError(res))
      await load()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
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

  const addService = () => {
    setCreateServices((prev) => [
      ...prev,
      { service_id: 0, service_name: 'Chọn dịch vụ', quantity: 1 },
    ])
  }

  const updateService = (idx: number, patch: Partial<ServiceInput>) => {
    setCreateServices((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    )
  }

  const removeService = (idx: number) => {
    setCreateServices((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: ReservationFormValue = {
      user_id: safeNumber(createUserId),
      reservation_time: createReservationTime,
      number_of_guests: safeNumber(createGuests, 1),
      status: createStatus,
      table_ids: parseIds(createTableIdsText),
      services: createServices
        .map((s) => ({
          service_id: safeNumber(s.service_id),
          quantity: safeNumber(s.quantity, 1),
          unit_price:
            s.unit_price === undefined || s.unit_price === null
              ? undefined
              : safeNumber(s.unit_price),
        }))
        .filter((s) => s.service_id > 0),
    }

    await handleCreate(payload)
  }

  return (
    <div className="rsv-page">
      <div className="rsv-head">
        <div>
          <h1 className="admin-title">Quản lý đặt bàn</h1>
        </div>

        <div className="rsv-head-actions">
          <button
            className="rsv-btn rsv-primary"
            onClick={() => setOpenCreate(true)}
          >
            + Tạo đặt bàn
          </button>
          <button className="rsv-btn" onClick={load}>
            Làm mới
          </button>
        </div>
      </div>

      <div className="rsv-filters">
        <div className="rsv-field">
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

        <div className="rsv-field">
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

        <div className="rsv-pagination">
          <button
            className="rsv-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </button>
          <div className="rsv-page-indicator">
            Trang <b>{page}</b> / {totalPages}
          </div>
          <button
            className="rsv-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </button>
        </div>
      </div>

      {error && (
        <div className="rsv-alert">
          <div className="rsv-alert-title">Lỗi</div>
          <div className="rsv-alert-msg">{error}</div>
        </div>
      )}

      <div className="rsv-card">
        <div className="rsv-table-wrap">
          <table className="rsv-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người đặt</th>
                <th style={{ width: 190 }}>Thời gian</th>
                <th>Số khách</th>
                <th>Trạng thái</th>
                <th style={{ width: 70 }}>Bàn</th>
                <th>Dịch vụ</th>
                <th style={{ width: 220 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="rsv-td-muted">
                    Đang tải...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rsv-td-muted">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const tables =
                    r.reservation_tables?.map(
                      (x) => x.restaurant_tables?.table_name || x.table_id,
                    ) ?? []

                  const services =
                    r.reservation_services?.map(
                      (x) => x.services?.name || x.service_id,
                    ) ?? []

                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <div className="rsv-cell">
                          <div className="rsv-strong">
                            {r.users?.full_name || `Người dùng #${r.user_id}`}
                          </div>
                          <div className="rsv-muted-sm">
                            {r.users?.email || ''}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rsv-cell">
                          <div className="rsv-strong">
                            {new Date(r.reservation_time).toLocaleString(
                              'vi-VN',
                            )}
                          </div>
                          <div className="rsv-muted-sm">
                            dự kiến kết thúc:
                            <br />{' '}
                            {new Date(r.reservation_endtime).toLocaleString(
                              'vi-VN',
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{r.number_of_guests}</td>
                      <td>
                        <span className={`rsv-badge rsv-badge-${r.status}`}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                      <td className="rsv-muted-sm">
                        {tables.join(', ') || '—'}
                      </td>
                      <td className="rsv-muted-sm">
                        {services.join(', ') || '—'}
                      </td>
                      <td>
                        <div className="rsv-actions-row">
                          <Link
                            className="rsv-btn"
                            href={`/admin/reservations/${r.id}`}
                          >
                            Chi tiết
                          </Link>
                          {/* <button
                            className="rsv-btn rsv-danger"
                            onClick={() => handleDelete(r.id)}
                          >
                            Xóa
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openCreate && (
        <div
          className="rsv-modal-overlay"
          onMouseDown={() => setOpenCreate(false)}
        >
          <div className="rsv-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="rsv-modal-head">
              <div>
                <div className="rsv-modal-title">Tạo đặt bàn</div>
                <div className="rsv-muted-sm">
                  Điền các trường cần thiết để tạo đặt bàn mới
                </div>
              </div>
              <button
                className="rsv-btn"
                onClick={() => {
                  setOpenCreate(false)
                  resetCreateForm()
                }}
              >
                Đóng
              </button>
            </div>

            <form className="rsv-form" onSubmit={handleCreateSubmit}>
              <div className="rsv-grid">
                <div className="rsv-field">
                  <label>ID người dùng</label>
                  <input
                    type="number"
                    value={createUserId}
                    onChange={(e) => setCreateUserId(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="rsv-field">
                  <label>Thời gian đặt bàn</label>
                  <input
                    type="datetime-local"
                    value={createReservationTime}
                    onChange={(e) => setCreateReservationTime(e.target.value)}
                    required
                  />
                </div>

                <div className="rsv-field">
                  <label>Số lượng khách</label>
                  <input
                    type="number"
                    value={createGuests}
                    onChange={(e) => setCreateGuests(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="rsv-field">
                  <label>Trạng thái</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value)}
                  >
                    {FORM_STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rsv-field rsv-span-2">
                  <label>ID bàn (ngăn cách bằng dấu phẩy)</label>
                  <input
                    value={createTableIdsText}
                    onChange={(e) => setCreateTableIdsText(e.target.value)}
                    placeholder="Ví dụ: 1, 2, 3"
                  />
                </div>
              </div>

              <div className="rsv-services">
                <div className="rsv-services-head">
                  <div>
                    <div className="rsv-title">Dịch vụ</div>
                    <div className="rsv-sub">
                      ID dịch vụ, tên dịch vụ, số lượng, đơn giá
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rsv-btn"
                    onClick={addService}
                  >
                    + Thêm dịch vụ
                  </button>
                </div>

                {createServices.length === 0 ? (
                  <div className="rsv-empty">Chưa có dịch vụ</div>
                ) : (
                  <div className="rsv-services-list">
                    {createServices.map((s, idx) => (
                      <div className="rsv-service-row" key={idx}>
                        <input
                          type="number"
                          placeholder="ID dịch vụ"
                          value={s.service_id || ''}
                          onChange={(e) =>
                            updateService(idx, {
                              service_id: Number(e.target.value),
                            })
                          }
                          min={1}
                        />

                        <input
                          type="text"
                          placeholder="Tên dịch vụ"
                          value={s.service_name ?? ''}
                          onChange={(e) =>
                            updateService(idx, {
                              service_name: e.target.value,
                            })
                          }
                        />

                        <input
                          type="number"
                          placeholder="Số lượng"
                          value={s.quantity}
                          onChange={(e) =>
                            updateService(idx, {
                              quantity: Number(e.target.value),
                            })
                          }
                          min={1}
                        />

                        <input
                          type="number"
                          placeholder="Đơn giá"
                          value={s.unit_price ?? ''}
                          onChange={(e) =>
                            updateService(idx, {
                              unit_price:
                                e.target.value === ''
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                          min={0}
                        />

                        <button
                          type="button"
                          className="rsv-btn rsv-danger"
                          onClick={() => removeService(idx)}
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rsv-actions">
                <button
                  className="rsv-btn rsv-primary"
                  disabled={creating}
                  type="submit"
                >
                  {creating ? 'Đang tạo...' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
