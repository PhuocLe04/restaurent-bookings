'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import 'animate.css'
import './page.css'

type ReservationDetail = {
  id: number
  user_id: number
  reservation_time: string
  reservation_endtime: string
  number_of_guests: number
  status: string
  checked_in_at: string | null
  completed_at: string | null
  created_at?: string | null

  customer?: {
    id: number
    full_name: string | null
    email: string | null
    phone: string | null
    role: string | null
  } | null

  reservation_tables?: Array<{
    reservation_id: number
    table_id: number
    table?: {
      id: number
      table_name: string
      capacity?: number | null
      is_active?: boolean | null
      table_type_id?: number | null
    } | null
  }>

  reservation_services?: Array<{
    reservation_id: number
    service_id: number
    quantity: number
    unit_price: number
    total_price?: number
    service?: {
      id: number
      name: string | null
      price?: number | null
      is_active?: boolean | null
      description?: string | null
      image?: string | null
      created_at?: string | null
    } | null
  }>

  orders?: Array<{
    id: number
    reservation_id: number
    user_id?: number | null
    status?: string | null
    grand_total?: number
    deposit_required?: number
    created_at?: string | null
  }>

  payments?: Array<{
    id: number
    amount?: number
    payment_method?: string | null
    purpose?: string | null
    status?: string | null
    created_at?: string | null
    paid_at?: string | null
    order_id?: string | null
    request_id?: string | null
    partner_transaction_id?: string | null
  }>

  summary?: {
    table_count?: number
    service_count?: number
    service_total?: number
    order_count?: number
    payment_count?: number
    paid_total?: number
    final_total?: number
    remaining_payment?: number
  }
}

type DetailResponse = {
  message?: string
  data: ReservationDetail
}

type ReservationUpdateValue = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  status: string
  table_ids: number[]
}

const STATUS_OPTIONS = [
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

function getStatusClass(status: string) {
  switch (String(status).toUpperCase()) {
    case 'PENDING':
      return 'is-pending'
    case 'CONFIRMED':
      return 'is-confirmed'
    case 'SEATED':
      return 'is-seated'
    case 'COMPLETED':
      return 'is-completed'
    case 'CANCELLED':
      return 'is-cancelled'
    case 'NO_SHOW':
      return 'is-no-show'
    default:
      return ''
  }
}

function parseIds(text: string): number[] {
  return text
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(value?: string | null) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN')
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value || 0))
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <motion.div
      className="reservation-detail-stat"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      whileHover={{ y: -4 }}
    >
      <div className="reservation-detail-stat__label">{label}</div>
      <div className="reservation-detail-stat__value">{value}</div>
      {sub ? <div className="reservation-detail-stat__sub">{sub}</div> : null}
    </motion.div>
  )
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => Number(params.id), [params.id])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ReservationDetail | null>(null)
  const [error, setError] = useState('')

  const [userId, setUserId] = useState(0)
  const [reservationTime, setReservationTime] = useState('')
  const [guests, setGuests] = useState(1)
  const [status, setStatus] = useState('PENDING')
  const [tableIdsText, setTableIdsText] = useState('')

  const load = async () => {
    try {
      setError('')
      setLoading(true)

      const res = await fetch(`/admin/api/reservation/${id}`, {
        cache: 'no-store',
      })
      const j = await res.json().catch(() => null)

      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`)

      const detail = (j as DetailResponse).data
      setData(detail)

      setUserId(detail.user_id)
      setReservationTime(toDatetimeLocal(detail.reservation_time))
      setGuests(detail.number_of_guests)
      setStatus(detail.status)
      setTableIdsText(
        detail.reservation_tables?.map((x) => x.table_id).join(', ') ?? '',
      )
    } catch (e: any) {
      setError(String(e?.message ?? e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: ReservationUpdateValue = {
      user_id: Number(userId),
      reservation_time: reservationTime,
      number_of_guests: Number(guests),
      status,
      table_ids: parseIds(tableIdsText),
    }

    try {
      setSaving(true)

      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const j = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(j?.message || `Cập nhật thất bại (HTTP ${res.status})`)
      }

      await load()
      alert('Cập nhật thành công!')
    } catch (e: any) {
      alert(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const ok = confirm(`Bạn có chắc muốn xóa đặt bàn #${id} không?`)
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(j?.message || `Xóa thất bại (HTTP ${res.status})`)
      }

      router.push('/admin/reservations')
      router.refresh()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
  }

  const summary = data?.summary

  return (
    <div className="reservation-detail-page">
      <div className="reservation-detail-shell">
        <motion.div
          className="reservation-detail-hero animate__animated animate__fadeInDown"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="reservation-detail-hero__glow reservation-detail-hero__glow--1" />
          <div className="reservation-detail-hero__glow reservation-detail-hero__glow--2" />

          <div className="reservation-detail-hero__content">
            <div className="reservation-detail-hero__eyebrow">
              Admin / Reservation / Detail
            </div>

            <h1 className="reservation-detail-hero__title">
              Chi tiết đặt bàn #{id}
            </h1>

            <p className="reservation-detail-hero__subtitle">
              {loading
                ? 'Đang tải dữ liệu...'
                : data?.customer?.full_name ||
                  `Người dùng #${data?.user_id ?? ''}`}
            </p>

            <div className="reservation-detail-hero__chips">
              <div className="reservation-chip">
                <span>Trạng thái</span>
                <strong>{getStatusLabel(data?.status || '')}</strong>
              </div>
              <div className="reservation-chip">
                <span>Số khách</span>
                <strong>{data?.number_of_guests ?? 0} khách</strong>
              </div>
              <div className="reservation-chip">
                <span>Số bàn</span>
                <strong>{data?.reservation_tables?.length ?? 0} bàn</strong>
              </div>
            </div>
          </div>

          <div className="reservation-detail-hero__actions">
            <span
              className={`reservation-detail-status-pill ${getStatusClass(
                data?.status || '',
              )}`}
            >
              {getStatusLabel(data?.status || '')}
            </span>

            <Link
              className="reservation-detail-back-btn"
              href="/admin/reservations"
            >
              ← Quay lại
            </Link>

            <button
              type="button"
              className="reservation-detail-secondary-btn"
              onClick={load}
            >
              Làm mới
            </button>

            <button
              type="button"
              className="reservation-detail-delete-btn"
              onClick={handleDelete}
            >
              Xóa
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {error ? (
            <motion.div
              className="reservation-alert danger animate__animated animate__headShake"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              Lỗi: {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {loading ? (
          <div className="reservation-detail-loading-card">
            <div className="reservation-detail-loading-spinner" />
            <div>Đang tải chi tiết reservation...</div>
          </div>
        ) : !data ? (
          <div className="reservation-detail-empty">Không tìm thấy dữ liệu</div>
        ) : (
          <>
            <section className="reservation-summary-top">
              <StatCard
                label="Tổng đơn hàng"
                value={summary?.order_count ?? data.orders?.length ?? 0}
              />
              <StatCard
                label="Tổng thanh toán"
                value={summary?.payment_count ?? data.payments?.length ?? 0}
              />
              <StatCard
                label="Đã thanh toán"
                value={formatCurrency(summary?.paid_total ?? 0)}
              />
              <StatCard
                label="Còn lại"
                value={formatCurrency(summary?.remaining_payment ?? 0)}
              />
            </section>

            <div className="reservation-detail-layout">
              <div className="reservation-detail-main">
                <motion.section
                  className="reservation-detail-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <div className="reservation-detail-card__head">
                    <div>
                      <h3 className="reservation-detail-card__title">
                        Tổng quan đặt bàn
                      </h3>
                      <p className="reservation-detail-card__subtitle">
                        Thông tin chính của reservation hiện tại.
                      </p>
                    </div>
                  </div>

                  <div className="reservation-detail-info-grid">
                    <div className="reservation-detail-info-box">
                      <span>Mã đặt bàn</span>
                      <strong>#{data.id}</strong>
                    </div>
                    <div className="reservation-detail-info-box">
                      <span>Trạng thái</span>
                      <strong>{getStatusLabel(data.status)}</strong>
                    </div>
                    <div className="reservation-detail-info-box">
                      <span>Thời gian đặt</span>
                      <strong>{formatDateTime(data.reservation_time)}</strong>
                    </div>
                    <div className="reservation-detail-info-box">
                      <span>Kết thúc dự kiến</span>
                      <strong>
                        {formatDateTime(data.reservation_endtime)}
                      </strong>
                    </div>
                    <div className="reservation-detail-info-box">
                      <span>Check-in</span>
                      <strong>{formatDateTime(data.checked_in_at)}</strong>
                    </div>
                    <div className="reservation-detail-info-box">
                      <span>Hoàn thành</span>
                      <strong>{formatDateTime(data.completed_at)}</strong>
                    </div>
                  </div>
                </motion.section>

                <motion.section
                  className="reservation-detail-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                >
                  <div className="reservation-detail-card__head">
                    <div>
                      <h3 className="reservation-detail-card__title">
                        Thông tin khách hàng
                      </h3>
                      <p className="reservation-detail-card__subtitle">
                        Người dùng gắn với đặt bàn này.
                      </p>
                    </div>
                  </div>

                  <div className="reservation-detail-customer">
                    <div className="reservation-detail-avatar">
                      {(data.customer?.full_name || 'U')
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="reservation-detail-customer__content">
                      <h4>{data.customer?.full_name || 'Không có tên'}</h4>
                      <div className="reservation-detail-customer__meta">
                        <span>Email: {data.customer?.email || '--'}</span>
                        <span>SĐT: {data.customer?.phone || '--'}</span>
                      </div>
                    </div>
                  </div>
                </motion.section>

                <motion.section
                  className="reservation-detail-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.11 }}
                >
                  <div className="reservation-detail-card__head">
                    <div>
                      <h3 className="reservation-detail-card__title">
                        Bàn đã chọn
                      </h3>
                      <p className="reservation-detail-card__subtitle">
                        Danh sách bàn đi kèm reservation.
                      </p>
                    </div>
                    <span className="reservation-detail-counter">
                      {data.reservation_tables?.length ?? 0} bàn
                    </span>
                  </div>

                  {data.reservation_tables?.length ? (
                    <div className="reservation-detail-pill-list">
                      {data.reservation_tables.map((item, index) => (
                        <div
                          key={`${item.table_id}-${index}`}
                          className="reservation-detail-pill"
                        >
                          <strong>
                            {item.table?.table_name || `Bàn #${item.table_id}`}
                          </strong>
                          <span>Sức chứa: {item.table?.capacity ?? '--'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="reservation-detail-empty-inline">
                      Chưa có bàn nào
                    </div>
                  )}
                </motion.section>

                <motion.section
                  className="reservation-detail-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                >
                  <div className="reservation-detail-card__head">
                    <div>
                      <h3 className="reservation-detail-card__title">
                        Dịch vụ đã chọn
                      </h3>
                      <p className="reservation-detail-card__subtitle">
                        Các dịch vụ đi kèm theo reservation.
                      </p>
                    </div>
                    <span className="reservation-detail-counter">
                      {data.reservation_services?.length ?? 0} dịch vụ
                    </span>
                  </div>

                  {data.reservation_services?.length ? (
                    <div className="reservation-detail-picked-list">
                      {data.reservation_services.map((service, index) => (
                        <div
                          key={`${service.service_id}-${index}`}
                          className="reservation-detail-picked-card"
                        >
                          <div className="reservation-detail-picked-card__main">
                            <div className="reservation-detail-picked-card__title-wrap">
                              <div className="reservation-detail-picked-card__title">
                                {service.service?.name ||
                                  `Dịch vụ #${service.service_id}`}
                              </div>
                              <div className="reservation-detail-picked-card__sub">
                                Số lượng: {service.quantity}
                              </div>
                            </div>

                            <div className="reservation-detail-price-chip">
                              <span>Tổng tiền</span>
                              <strong>
                                {formatCurrency(
                                  service.total_price ??
                                    Number(service.quantity || 0) *
                                      Number(service.unit_price || 0),
                                )}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="reservation-detail-empty-inline">
                      Chưa có dịch vụ nào
                    </div>
                  )}
                </motion.section>

                <motion.section
                  className="reservation-detail-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.17 }}
                >
                  <div className="reservation-detail-card__head">
                    <div>
                      <h3 className="reservation-detail-card__title">
                        Đơn hàng
                      </h3>
                      <p className="reservation-detail-card__subtitle">
                        Các order liên kết với reservation này.
                      </p>
                    </div>
                    <span className="reservation-detail-counter">
                      {data.orders?.length ?? 0} đơn
                    </span>
                  </div>

                  {data.orders?.length ? (
                    <div className="reservation-detail-payment-wrap">
                      <table className="reservation-detail-payment-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Trạng thái</th>
                            <th>Tổng tiền</th>
                            <th>Tiền cọc</th>
                            <th>Ngày tạo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.orders.map((order) => (
                            <tr key={order.id}>
                              <td>#{order.id}</td>
                              <td>{order.status || '--'}</td>
                              <td>{formatCurrency(order.grand_total || 0)}</td>
                              <td>
                                {formatCurrency(order.deposit_required || 0)}
                              </td>
                              <td>{formatDateTime(order.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="reservation-detail-empty-inline">
                      Chưa có đơn hàng
                    </div>
                  )}
                </motion.section>

                <motion.section
                  className="reservation-detail-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="reservation-detail-card__head">
                    <div>
                      <h3 className="reservation-detail-card__title">
                        Lịch sử thanh toán
                      </h3>
                      <p className="reservation-detail-card__subtitle">
                        Các giao dịch đã phát sinh.
                      </p>
                    </div>
                    <span className="reservation-detail-counter">
                      {data.payments?.length ?? 0} giao dịch
                    </span>
                  </div>

                  {data.payments?.length ? (
                    <div className="reservation-detail-payment-wrap">
                      <table className="reservation-detail-payment-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Số tiền</th>
                            <th>Phương thức</th>
                            <th>Mục đích</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>#{payment.id}</td>
                              <td>{formatCurrency(payment.amount || 0)}</td>
                              <td>{payment.payment_method || '--'}</td>
                              <td>{payment.purpose || '--'}</td>
                              <td>{payment.status || '--'}</td>
                              <td>{formatDateTime(payment.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="reservation-detail-empty-inline">
                      Chưa có thanh toán
                    </div>
                  )}
                </motion.section>
              </div>

              <motion.aside
                className="reservation-detail-side"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 }}
              >
                <section className="reservation-detail-summary-card">
                  <div className="reservation-detail-summary-card__head">
                    <div>
                      <h3>Cập nhật đặt bàn</h3>
                      <p>Chỉnh nhanh thông tin cơ bản của reservation.</p>
                    </div>
                  </div>

                  <form
                    className="reservation-detail-form"
                    onSubmit={handleUpdate}
                  >
                    <div className="reservation-detail-field">
                      <label>ID người dùng</label>
                      <input
                        type="number"
                        value={userId}
                        onChange={(e) => setUserId(Number(e.target.value))}
                        min={1}
                        required
                      />
                    </div>

                    <div className="reservation-detail-field">
                      <label>Thời gian đặt bàn</label>
                      <input
                        type="datetime-local"
                        value={reservationTime}
                        onChange={(e) => setReservationTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="reservation-detail-field">
                      <label>Số lượng khách</label>
                      <input
                        type="number"
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        min={1}
                        required
                      />
                    </div>

                    <div className="reservation-detail-field">
                      <label>Trạng thái</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="reservation-detail-field">
                      <label>ID bàn</label>
                      <textarea
                        value={tableIdsText}
                        onChange={(e) => setTableIdsText(e.target.value)}
                        placeholder="Ví dụ: 1, 2, 3"
                        rows={4}
                      />
                      <small>
                        Nhập danh sách ID bàn, ngăn cách bằng dấu phẩy.
                      </small>
                    </div>

                    <div className="summary-actions">
                      <button
                        className="reservation-detail-submit-btn"
                        disabled={saving}
                        type="submit"
                      >
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  </form>
                </section>
              </motion.aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
