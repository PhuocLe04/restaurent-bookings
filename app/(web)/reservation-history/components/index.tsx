'use client'

import 'animate.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import './index.css'

type TableInfo = {
  table_name: string
  capacity: number
  table_types?: { name: string } | null
}

type ReservationRow = {
  id: number
  reservation_time: string
  reservation_endtime: string
  number_of_guests: number
  status: string
  created_at: string
  reservation_tables: {
    restaurant_tables: TableInfo
  }[]
  orders: {
    id: number
    grand_total: string | number
    deposit_required: string | number
    status: string
  }[]
  payments: {
    id: number
    amount: string | number
    status: string
    purpose: string
  }[]
}

type HistoryResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  successPaymentCount: number
  data: ReservationRow[]
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

function fmtDate(iso?: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('vi-VN')
}

function money(value?: string | number) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0 ₫'
  return `${n.toLocaleString('vi-VN')} ₫`
}

function statusBadgeClass(status?: string) {
  const s = (status || '').toUpperCase()

  if (s === 'PENDING') return 'rh-badge-warning'
  if (s === 'CONFIRMED') return 'rh-badge-primary'
  if (s === 'SEATED') return 'rh-badge-info'
  if (s === 'COMPLETED') return 'rh-badge-success'
  if (s === 'CANCELLED') return 'rh-badge-danger'
  if (s === 'NO_SHOW') return 'rh-badge-dark'

  return 'rh-badge-secondary'
}

function statusLabel(status?: string) {
  const s = (status || '').toUpperCase()

  if (s === 'PENDING') return 'Chờ xác nhận'
  if (s === 'CONFIRMED') return 'Đã xác nhận'
  if (s === 'SEATED') return 'Đã vào bàn'
  if (s === 'COMPLETED') return 'Hoàn thành'
  if (s === 'CANCELLED') return 'Đã huỷ'
  if (s === 'NO_SHOW') return 'Không đến'

  return status || '-'
}

function paymentStatusClass(status?: string) {
  const s = (status || '').toUpperCase()

  if (s === 'SUCCESS') return 'rh-payment-success'
  if (s === 'PENDING') return 'rh-payment-pending'
  if (s === 'FAILED') return 'rh-payment-failed'

  return 'rh-payment-muted'
}

function paymentStatusLabel(status?: string) {
  const s = (status || '').toUpperCase()

  if (s === 'SUCCESS') return 'Thành công'
  if (s === 'PENDING') return 'Đang chờ'
  if (s === 'FAILED') return 'Thất bại'

  return status || '-'
}

function orderStatusLabel(status?: string) {
  const s = (status || '').toUpperCase()
  if (s === 'OPEN') return 'Đang mở'
  if (s === 'CLOSED') return 'Đã đóng'
  if (s === 'CANCELLED') return 'Đã huỷ'
  return status || '-'
}

export default function ReservationHistoryClient() {
  const [data, setData] = useState<ReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [successPaymentCount, setSuccessPaymentCount] = useState(0)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(
          `/api/reservations/historys?page=${page}&limit=5`,
          {
            cache: 'no-store',
            credentials: 'include',
          },
        )

        if (!res.ok) {
          const j = await res.json().catch(() => null)
          throw new Error(j?.message || 'Không thể tải lịch sử đặt bàn')
        }

        const json = (await res.json()) as HistoryResponse
        if (!mounted) return

        setData(json.data || [])
        setTotalPages(json.totalPages || 1)
        setTotal(json.total || 0)
        setSuccessPaymentCount(json.successPaymentCount || 0)
      } catch (e: any) {
        if (!mounted) return
        setError(e.message || 'Đã xảy ra lỗi')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [page])

  if (loading) {
    return (
      <div className="reservation-history-page">
        <div className="container py-4">
          <motion.div
            className="rh-state-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div className="rh-state-body animate__animated animate__fadeIn">
              <div className="rh-spinner" />
              <div>
                <div className="rh-state-title">Đang tải lịch sử đặt bàn</div>
                <div className="rh-state-text">
                  Vui lòng chờ trong giây lát...
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="reservation-history-page">
        <div className="container py-4">
          <motion.div
            className="rh-state-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div className="rh-state-stack animate__animated animate__fadeIn">
              <div className="rh-alert-danger">{error}</div>
              <Link href="/login" className="rh-btn rh-btn-primary">
                Đi tới đăng nhập
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="reservation-history-page">
      <div className="container py-4">
        <motion.div
          className="rh-header animate__animated animate__fadeInDown"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <div>
            <h1 className="rh-title">Lịch sử đặt bàn</h1>
          </div>

          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/reservation" className="rh-btn rh-btn-primary">
              Đặt bàn mới
            </Link>
          </motion.div>
        </motion.div>

        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <motion.div
              className="rh-stat-card animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.45 }}
              whileHover={{ y: -3 }}
            >
              <div className="rh-stat-label">Tổng bàn đã đặt</div>
              <div className="rh-stat-value">{total}</div>
            </motion.div>
          </div>

          <div className="col-12 col-md-6">
            <motion.div
              className="rh-stat-card animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              whileHover={{ y: -3 }}
            >
              <div className="rh-stat-label">Thanh toán </div>
              <div className="rh-stat-value">{successPaymentCount}</div>
            </motion.div>
          </div>
        </div>

        {data.length === 0 ? (
          <motion.div
            className="rh-empty-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="rh-empty-title">Chưa có lịch sử đặt bàn</div>
            <div className="rh-empty-text">
              Bạn chưa tạo reservation nào trong hệ thống.
            </div>
            <Link href="/reservation" className="rh-btn rh-btn-outline mt-3">
              Đặt bàn ngay
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="rh-list">
              {data.map((r, index) => {
                const order = r.orders?.[0]
                const paymentCount = r.payments?.length || 0

                return (
                  <motion.div
                    key={r.id}
                    className="rh-reservation-card animate__animated animate__fadeInUp"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.06 * index,
                      duration: 0.45,
                      ease: EASE_OUT_EXPO,
                    }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="rh-reservation-body">
                      <div className="rh-reservation-top">
                        <div>
                          <div className="rh-reservation-head">
                            <span className="rh-reservation-id">
                              Reservation #{r.id}
                            </span>
                            <span
                              className={`rh-status-badge ${statusBadgeClass(r.status)}`}
                            >
                              {statusLabel(r.status)}
                            </span>
                          </div>

                          <div className="rh-created-at">
                            Tạo lúc: {fmtDate(r.created_at)}
                          </div>
                        </div>

                        <motion.div
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Link
                            href={`/reservation-history/${r.id}`}
                            className="rh-btn rh-btn-outline"
                          >
                            Xem chi tiết
                          </Link>
                        </motion.div>
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-md-6 col-xl-3">
                          <motion.div
                            className="rh-info-box"
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="rh-info-label">
                              Thời gian đặt bàn
                            </div>
                            <div className="rh-info-value">
                              {fmtDate(r.reservation_time)}
                            </div>
                            <div className="rh-info-sub">
                              Kết thúc: {fmtDate(r.reservation_endtime)}
                            </div>
                          </motion.div>
                        </div>

                        <div className="col-12 col-md-6 col-xl-3">
                          <motion.div
                            className="rh-info-box"
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="rh-info-label">Số lượng khách</div>
                            <div className="rh-info-value rh-info-big">
                              {r.number_of_guests}
                            </div>
                            <div className="rh-info-sub">
                              Số bàn: {r.reservation_tables?.length || 0}
                            </div>
                          </motion.div>
                        </div>

                        <div className="col-12 col-md-6 col-xl-3">
                          <motion.div
                            className="rh-info-box"
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="rh-info-label">Chi phí</div>
                            {order ? (
                              <>
                                <div className="rh-info-value">
                                  Tổng: {money(order.grand_total)}
                                </div>
                                <div className="rh-info-sub">
                                  Cọc: {money(order.deposit_required)}
                                </div>
                                <div className="rh-info-sub">
                                  Order: {orderStatusLabel(order.status)}
                                </div>
                              </>
                            ) : (
                              <div className="rh-info-sub">Chưa có order</div>
                            )}
                          </motion.div>
                        </div>

                        <div className="col-12 col-md-6 col-xl-3">
                          <motion.div
                            className="rh-info-box"
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="rh-info-label">Thanh toán</div>
                            {paymentCount > 0 ? (
                              <div className="rh-payment-list">
                                {r.payments.slice(0, 2).map((p) => (
                                  <div key={p.id} className="rh-payment-item">
                                    <div>
                                      <span className="rh-payment-purpose">
                                        {p.purpose}
                                      </span>{' '}
                                      <span
                                        className={paymentStatusClass(p.status)}
                                      >
                                        ({paymentStatusLabel(p.status)})
                                      </span>
                                    </div>
                                    <div className="rh-payment-amount">
                                      {money(p.amount)}
                                    </div>
                                  </div>
                                ))}

                                {paymentCount > 2 ? (
                                  <div className="rh-more-text">
                                    + {paymentCount - 2} thanh toán khác
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="rh-info-sub">
                                Chưa có thanh toán
                              </div>
                            )}
                          </motion.div>
                        </div>
                      </div>

                      <div className="rh-table-section">
                        <div className="rh-info-label">Bàn đã đặt</div>
                        <div className="rh-chip-list">
                          {r.reservation_tables?.length > 0 ? (
                            r.reservation_tables.map((t, i) => (
                              <motion.span
                                key={i}
                                className="rh-chip"
                                whileHover={{ y: -2, scale: 1.02 }}
                                transition={{ duration: 0.18 }}
                              >
                                {t.restaurant_tables.table_name}
                                {' · '}
                                {t.restaurant_tables.capacity} chỗ
                                {t.restaurant_tables.table_types?.name
                                  ? ` · ${t.restaurant_tables.table_types.name}`
                                  : ''}
                              </motion.span>
                            ))
                          ) : (
                            <span className="rh-more-text">
                              Không có thông tin bàn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <motion.div
              className="rh-pagination-card animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45 }}
            >
              <div className="rh-pagination-inner">
                <div className="rh-pagination-info">
                  Tổng bản ghi: <strong>{total}</strong>
                </div>

                <div className="rh-pagination-actions">
                  <motion.button
                    className="rh-btn rh-btn-outline rh-btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    whileHover={page > 1 ? { y: -2 } : {}}
                    whileTap={page > 1 ? { scale: 0.98 } : {}}
                  >
                    ← Trước
                  </motion.button>

                  <span className="rh-page-indicator">
                    Trang <strong>{page}</strong> / {totalPages}
                  </span>

                  <motion.button
                    className="rh-btn rh-btn-outline rh-btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    whileHover={page < totalPages ? { y: -2 } : {}}
                    whileTap={page < totalPages ? { scale: 0.98 } : {}}
                  >
                    Sau →
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}
