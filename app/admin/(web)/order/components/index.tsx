'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
    pending_total?: number
    remaining_estimated: number
  } | null
  menu_items?: Array<{
    id: number
    menu_item_id: number
    name: string
    image?: string | null
    category?: string | null
    quantity: number
    unit_price: number
    line_total: number
    is_available?: boolean
  }>
  service_items?: Array<{
    service_id: number
    name: string
    image?: string | null
    description?: string | null
    quantity: number
    unit_price: number
    line_total: number
  }>
  payments?: Array<{
    id: number
    amount: number
    payment_method: string
    purpose: string
    status: string
    order_id: string
    request_id: string
    partner_transaction_id?: string | null
    created_at?: string | null
    paid_at?: string | null
  }>
}

type OrderDetail = {
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
    member_point?: number
    membership?: {
      id: number
      code: string
      name: string
      discount_percent: number
    } | null
  } | null
  reservation?: {
    id: number
    reservation_time: string
    reservation_endtime: string
    checked_in_at?: string | null
    completed_at?: string | null
    number_of_guests: number
    status: string
    customer?: {
      id: number
      full_name: string
      email: string
      phone: string
      role: string
    } | null
    tables?: Array<{
      table_id: number
      table_name: string
      capacity: number
      table_type?: string | null
      table_type_description?: string | null
    }>
  } | null
  menu_items?: Array<{
    id: number
    menu_item_id: number
    name: string
    image?: string | null
    category?: string | null
    quantity: number
    unit_price: number
    line_total: number
    is_available?: boolean
  }>
  service_items?: Array<{
    service_id: number
    name: string
    image?: string | null
    description?: string | null
    quantity: number
    unit_price: number
    line_total: number
    is_active?: boolean
    created_at?: string | null
  }>
  payments?: Array<{
    id: number
    amount: number
    payment_method: string
    purpose: string
    status: string
    order_id: string
    request_id: string
    partner_transaction_id?: string | null
    gateway_response?: string | null
    created_at?: string | null
    paid_at?: string | null
  }>
  summary?: {
    menu_total: number
    service_total: number
    order_grand_total: number
    paid_total: number
    pending_total?: number
    remaining_estimated: number
  } | null
}

type ListResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  data: OrderRow[]
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

function getPaymentStatusLabel(status: string) {
  switch (String(status).toUpperCase()) {
    case 'SUCCESS':
      return 'Thành công'
    case 'PENDING':
      return 'Đang chờ'
    case 'FAIL':
      return 'Thất bại'
    default:
      return status || 'Không rõ'
  }
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

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<OrderRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const [openDetail, setOpenDetail] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<OrderDetail | null>(null)

  const [updatingId, setUpdatingId] = useState<number | null>(null)

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
      setError(String(e?.message || e))
      setRows([])
      setTotalPages(1)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleOpenDetail = async (id: number) => {
    try {
      setOpenDetail(true)
      setDetailLoading(true)
      setDetail(null)

      const res = await fetch(`/admin/api/order/${id}`, {
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(await readApiError(res))

      const data = (await res.json()) as OrderDetail
      setDetail(data)
    } catch (e: any) {
      alert(String(e?.message || e))
      setOpenDetail(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(id)

      const res = await fetch(`/admin/api/order/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) throw new Error(await readApiError(res))

      await load()

      if (detail?.id === id) {
        await handleOpenDetail(id)
      }
    } catch (e: any) {
      alert(String(e?.message || e))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="order-page">
      <div className="order-head">
        <div>
          <h1 className="admin-title">Quản lý order</h1>
        </div>

        <div className="order-head-actions">
          <button className="order-btn" type="button" onClick={load}>
            Làm mới
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
                  <th style={{ width: 260 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
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
                          {formatDateTime(row.reservation?.reservation_time)}
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
                      <span className={`order-badge order-badge-${row.status}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>

                    <td>{formatMoney(row.items_summary?.menu_total)}</td>
                    <td>{formatMoney(row.items_summary?.service_total)}</td>
                    <td>{formatMoney(row.items_summary?.paid_total)}</td>
                    <td>
                      {formatMoney(row.items_summary?.remaining_estimated)}
                    </td>

                    <td>
                      <div className="order-actions-row">
                        <button
                          className="order-btn"
                          type="button"
                          onClick={() => handleOpenDetail(row.id)}
                        >
                          Chi tiết
                        </button>

                        <Link
                          className="order-btn"
                          href={`/admin/reservations/${row.reservation_id}`}
                        >
                          Đặt bàn
                        </Link>

                        <select
                          className="order-inline-select"
                          value={row.status}
                          disabled={updatingId === row.id}
                          onChange={(e) =>
                            handleUpdateStatus(
                              row.id,
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openDetail && (
        <div
          className="order-modal-overlay"
          onClick={() => setOpenDetail(false)}
        >
          <div
            className="order-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="order-modal-head">
              <div>
                <div className="order-modal-title">
                  Chi tiết order {detail?.id ? `#${detail.id}` : ''}
                </div>
                <div className="order-muted-sm">
                  {detail?.created_at
                    ? `Tạo lúc: ${formatDateTime(detail.created_at)}`
                    : ''}
                </div>
              </div>

              <button
                className="order-btn"
                type="button"
                onClick={() => setOpenDetail(false)}
              >
                Đóng
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="order-empty">Đang tải chi tiết...</div>
            ) : (
              <>
                <div className="order-sum">
                  <div className="order-sum-item">
                    <div className="order-muted-sm">Mã order</div>
                    <div className="order-strong">#{detail.id}</div>
                  </div>
                  <div className="order-sum-item">
                    <div className="order-muted-sm">Trạng thái</div>
                    <div>
                      <span
                        className={`order-badge order-badge-${detail.status}`}
                      >
                        {getStatusLabel(detail.status)}
                      </span>
                    </div>
                  </div>
                  <div className="order-sum-item">
                    <div className="order-muted-sm">Tổng món</div>
                    <div className="order-strong">
                      {formatMoney(detail.summary?.menu_total)}
                    </div>
                  </div>
                  <div className="order-sum-item">
                    <div className="order-muted-sm">Tổng dịch vụ</div>
                    <div className="order-strong">
                      {formatMoney(detail.summary?.service_total)}
                    </div>
                  </div>
                  <div className="order-sum-item">
                    <div className="order-muted-sm">Cọc đã thanh toán</div>
                    <div className="order-strong">
                      {formatMoney(detail.summary?.paid_total)}
                    </div>
                  </div>
                  <div className="order-sum-item">
                    <div className="order-muted-sm">Còn lại</div>
                    <div className="order-strong">
                      {formatMoney(detail.summary?.remaining_estimated)}
                    </div>
                  </div>
                </div>

                <div className="order-divider" />

                <div className="order-section">
                  <div className="order-section-title">Khách hàng</div>
                  <div className="order-grid">
                    <div className="order-info-card">
                      <div className="order-muted-sm">Họ tên</div>
                      <div className="order-strong">
                        {detail.user?.full_name || '—'}
                      </div>
                    </div>
                    <div className="order-info-card">
                      <div className="order-muted-sm">Email</div>
                      <div className="order-strong">
                        {detail.user?.email || '—'}
                      </div>
                    </div>
                    <div className="order-info-card">
                      <div className="order-muted-sm">Số điện thoại</div>
                      <div className="order-strong">
                        {detail.user?.phone || '—'}
                      </div>
                    </div>
                    <div className="order-info-card">
                      <div className="order-muted-sm">Hạng thành viên</div>
                      <div className="order-strong">
                        {detail.user?.membership?.name || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="order-section">
                  <div className="order-section-title">Thông tin đặt bàn</div>
                  <div className="order-grid">
                    <div className="order-info-card">
                      <div className="order-muted-sm">Mã đặt bàn</div>
                      <div className="order-strong">
                        #{detail.reservation?.id || detail.reservation_id}
                      </div>
                    </div>
                    <div className="order-info-card">
                      <div className="order-muted-sm">Thời gian</div>
                      <div className="order-strong">
                        {formatDateTime(detail.reservation?.reservation_time)}
                      </div>
                    </div>
                    <div className="order-info-card">
                      <div className="order-muted-sm">Kết thúc dự kiến</div>
                      <div className="order-strong">
                        {formatDateTime(
                          detail.reservation?.reservation_endtime,
                        )}
                      </div>
                    </div>
                    <div className="order-info-card">
                      <div className="order-muted-sm">Số khách</div>
                      <div className="order-strong">
                        {detail.reservation?.number_of_guests ?? '—'}
                      </div>
                    </div>
                  </div>

                  <div className="order-sub-list">
                    <div className="order-muted-sm">Bàn đã đặt</div>
                    <div className="order-tags">
                      {detail.reservation?.tables?.length ? (
                        detail.reservation.tables.map((table) => (
                          <span key={table.table_id} className="order-tag">
                            {table.table_name} · {table.capacity} chỗ
                          </span>
                        ))
                      ) : (
                        <span className="order-muted-sm">Không có bàn</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="order-section">
                  <div className="order-section-title">Món ăn</div>
                  {!detail.menu_items?.length ? (
                    <div className="order-empty-small">Không có món</div>
                  ) : (
                    <div className="order-table-wrap">
                      <table className="order-table order-table--detail">
                        <thead>
                          <tr>
                            <th>Món</th>
                            <th>Danh mục</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.menu_items.map((item) => (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td>{item.category || '—'}</td>
                              <td>{item.quantity}</td>
                              <td>{formatMoney(item.unit_price)}</td>
                              <td>{formatMoney(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="order-section">
                  <div className="order-section-title">Dịch vụ</div>
                  {!detail.service_items?.length ? (
                    <div className="order-empty-small">Không có dịch vụ</div>
                  ) : (
                    <div className="order-table-wrap">
                      <table className="order-table order-table--detail">
                        <thead>
                          <tr>
                            <th>Dịch vụ</th>
                            <th>Mô tả</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.service_items.map((item) => (
                            <tr key={item.service_id}>
                              <td>{item.name}</td>
                              <td>{item.description || '—'}</td>
                              <td>{item.quantity}</td>
                              <td>{formatMoney(item.unit_price)}</td>
                              <td>{formatMoney(item.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="order-section">
                  <div className="order-section-title">Thanh toán</div>
                  {!detail.payments?.length ? (
                    <div className="order-empty-small">Chưa có thanh toán</div>
                  ) : (
                    <div className="order-table-wrap">
                      <table className="order-table order-table--detail">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Số tiền</th>
                            <th>Phương thức</th>
                            <th>Mục đích</th>
                            <th>Trạng thái</th>
                            <th>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.payments.map((item) => (
                            <tr key={item.id}>
                              <td>#{item.id}</td>
                              <td>{formatMoney(item.amount)}</td>
                              <td>{item.payment_method}</td>
                              <td>{item.purpose}</td>
                              <td>{getPaymentStatusLabel(item.status)}</td>
                              <td>
                                {formatDateTime(
                                  item.paid_at || item.created_at,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="order-actions">
                  <select
                    className="order-inline-select"
                    value={detail.status}
                    disabled={updatingId === detail.id}
                    onChange={(e) =>
                      handleUpdateStatus(
                        detail.id,
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

                  <button
                    className="order-btn"
                    type="button"
                    onClick={() => setOpenDetail(false)}
                  >
                    Đóng
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
