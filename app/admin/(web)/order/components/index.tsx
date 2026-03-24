'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import './index.css'

type OrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'

type OrderRow = {
  id: number
  reservation_id: number
  user_id: number
  status: string
  grand_total: number
  deposit_required: number
  created_at: string | null
  user?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
  reservation?: {
    id: number
    reservation_time: string
    reservation_endtime: string
    number_of_guests: number
    status: string
    tables: string[]
  } | null
  items_summary?: {
    menu_count: number
    service_count: number
    menu_total: number
    service_total: number
    paid_total: number
    final_paid_total?: number
    pending_total?: number
    remaining_estimated: number
    has_final_paid?: boolean
  } | null
}

type ListResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  data: OrderRow[]
}

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  key: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const UPDATE_STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const EDITABLE_RESERVATION_STATUSES = ['CONFIRMED', 'PENDING', 'SEATED']

function todayInputValue() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatMoney(value: unknown) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0 ₫'
  return `${n.toLocaleString('vi-VN')} ₫`
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN')
}

function getStatusLabel(status: string) {
  switch (String(status).toUpperCase()) {
    case 'OPEN':
      return 'Đang mở'
    case 'CLOSED':
      return 'Đã đóng'
    case 'CANCELLED':
      return 'Đã hủy'
    default:
      return status || 'Không rõ'
  }
}

function getReservationStatusLabel(status?: string) {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'Chờ xác nhận'
    case 'CONFIRMED':
      return 'Đã xác nhận'
    case 'SEATED':
      return 'Đã vào bàn'
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

function canEditOrderStatusByReservation(reservationStatus?: string | null) {
  const normalized = String(reservationStatus || '')
    .trim()
    .toUpperCase()
  return EDITABLE_RESERVATION_STATUSES.includes(normalized)
}

async function readApiError(res: Response) {
  const ct = res.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) {
      const j = await res.json()
      return j?.message || `Yêu cầu thất bại (HTTP ${res.status})`
    }
    const txt = await res.text()
    return txt?.slice(0, 300) || `Yêu cầu thất bại (HTTP ${res.status})`
  } catch {
    return `Yêu cầu thất bại (HTTP ${res.status})`
  }
}

export default function OrdersIndexPage() {
  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [date, setDate] = useState(todayInputValue())
  const [refreshing, setRefreshing] = useState(false)

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<OrderRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  function showToast(type: MessageType, title: string, message: string) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
    }))
  }

  function closeToast() {
    setToast((prev) => ({ ...prev, visible: false }))
  }

  const query = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('limit', String(limit))
    if (status) sp.set('status', status)
    if (keyword.trim()) sp.set('keyword', keyword.trim())
    if (date) sp.set('date', date)
    return sp.toString()
  }, [page, limit, status, keyword, date])

  const load = async () => {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/admin/api/order?${query}`, {
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(await readApiError(res))

      const data = (await res.json()) as ListResponse
      setRows(data.data || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (e: any) {
      const msg = String(e?.message || e)
      setError(msg)
      setRows([])
      setTotalPages(1)
      setTotal(0)
      showToast('error', 'Tải dữ liệu thất bại', msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleRefreshPage() {
    setRefreshing(true)
    load()
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleUpdateStatus = async (row: OrderRow, nextStatus: OrderStatus) => {
    const reservationStatus = row.reservation?.status
    const editable = canEditOrderStatusByReservation(reservationStatus)

    if (!editable) {
      showToast(
        'warning',
        'Không thể chỉnh trạng thái',
        `Chỉ được chỉnh trạng thái đơn hàng khi reservation ở trạng thái CONFIRMED, PENDING hoặc SEATED. Trạng thái hiện tại là ${getReservationStatusLabel(
          reservationStatus,
        )}.`,
      )
      return
    }

    try {
      setUpdatingId(row.id)

      const res = await fetch(`/admin/api/order/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) throw new Error(await readApiError(res))

      showToast(
        'success',
        'Cập nhật thành công',
        'Đã cập nhật trạng thái đơn hàng.',
      )
      await load()
    } catch (e: any) {
      const msg = String(e?.message || e)
      showToast('error', 'Cập nhật thất bại', msg)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        autoClose={3500}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
      />

      <div className="order-page">
        <div className="order-head">
          <div>
            <h1 className="admin-title">Quản lý order</h1>
          </div>

          <div className="order-head-actions">
            <button
              className="order-btn"
              type="button"
              onClick={handleRefreshPage}
              disabled={refreshing || loading}
            >
              {refreshing ? 'Đang làm mới...' : 'Làm mới'}
            </button>
          </div>
        </div>

        <div className="order-filters">
          <div className="order-filters-row order-filters-row--top">
            <div className="order-field">
              <label>Trạng thái</label>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1)
                  setStatus(e.target.value)
                }}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value || 'ALL'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="order-field">
              <label>Tìm kiếm</label>
              <input
                value={keyword}
                onChange={(e) => {
                  setPage(1)
                  setKeyword(e.target.value)
                }}
                placeholder="Tên khách, email,..."
              />
            </div>

            <div className="order-field">
              <label>Ngày tạo order</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setPage(1)
                  setDate(e.target.value)
                }}
              />
            </div>
          </div>

          <div className="order-filters-row order-filters-row--bottom">
            <div className="order-bottom-bar">
              <div className="order-total">
                Tổng order: <b>{total}</b>
              </div>

              <div className="order-pagination">
                <button
                  className="order-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  type="button"
                >
                  Trước
                </button>

                <div className="order-page-indicator">
                  Trang <b>{page}</b> / {totalPages}
                </div>

                <button
                  className="order-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="order-alert">
            <div className="order-alert-title">Lỗi</div>
            <div className="order-alert-msg">{error}</div>
          </div>
        )}

        <div className="order-card">
          {loading ? (
            <div className="order-empty">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="order-empty">Không có dữ liệu</div>
          ) : (
            <div className="order-table-wrap">
              <table className="order-table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Mã</th>
                    <th style={{ width: 200 }}>Khách hàng</th>
                    <th style={{ width: 170 }}>Đặt bàn</th>
                    <th style={{ width: 120 }}>Trạng thái</th>
                    <th style={{ width: 130 }}>Tiền món</th>
                    <th style={{ width: 130 }}>Tiền dịch vụ</th>
                    <th style={{ width: 130 }}>Cọc đã thanh toán</th>
                    <th style={{ width: 130 }}>Còn lại</th>
                    <th style={{ width: 280 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const editable = canEditOrderStatusByReservation(
                      row.reservation?.status,
                    )

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="order-cell">
                            <div className="order-strong">#{row.id}</div>
                            <div className="order-muted-sm">
                              {formatDateTime(row.created_at)}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="order-cell">
                            <div className="order-strong">
                              {row.user?.full_name || `User #${row.user_id}`}
                            </div>
                            <div className="order-muted-sm">
                              {row.user?.email || '—'}
                            </div>
                            <div className="order-muted-sm">
                              {row.user?.phone || '—'}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="order-cell">
                            <div className="order-strong">
                              #{row.reservation_id}
                            </div>
                            <div className="order-muted-sm">
                              {formatDateTime(
                                row.reservation?.reservation_time,
                              )}
                            </div>
                            <div className="order-muted-sm">
                              Trạng thái bàn:{' '}
                              {getReservationStatusLabel(
                                row.reservation?.status,
                              )}
                            </div>
                            <div className="order-muted-sm">
                              Bàn:{' '}
                              {row.reservation?.tables?.length
                                ? row.reservation.tables.join(', ')
                                : '—'}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`order-badge order-badge-${row.status}`}
                          >
                            {getStatusLabel(row.status)}
                          </span>
                        </td>

                        <td>{formatMoney(row.items_summary?.menu_total)}</td>
                        <td>{formatMoney(row.items_summary?.service_total)}</td>
                        <td>{formatMoney(row.items_summary?.paid_total)}</td>

                        <td>
                          {row.items_summary?.has_final_paid ? (
                            <span className="order-paid-chip">
                              Đã thanh toán
                            </span>
                          ) : (
                            formatMoney(row.items_summary?.remaining_estimated)
                          )}
                        </td>

                        <td>
                          <div className="order-actions-row">
                            <Link
                              className="order-btn"
                              href={`/admin/order/${row.id}`}
                            >
                              Chi tiết
                            </Link>

                            <Link
                              className="order-btn"
                              href={`/admin/reservations/${row.reservation_id}`}
                            >
                              Đặt bàn
                            </Link>

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                minWidth: 120,
                              }}
                            >
                              <select
                                className={`order-inline-select ${
                                  !editable ? 'is-disabled' : ''
                                }`}
                                value={row.status}
                                disabled={updatingId === row.id || !editable}
                                onChange={(e) =>
                                  handleUpdateStatus(
                                    row,
                                    e.target.value as OrderStatus,
                                  )
                                }
                              >
                                {UPDATE_STATUS_OPTIONS.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
