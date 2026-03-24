'use client'

import 'animate.css'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import CancelReservationModal from '@/app/ui/cancel/cancel'
import './index.css'

type TableType = { id: number; name: string; description?: string | null }

type RestaurantTable = {
  id: number
  table_name: string
  capacity: number
  is_active: boolean | null
  table_types: TableType | null
}

type ReservationTable = {
  table_id: number
  restaurant_tables: RestaurantTable
}

type Service = {
  id: number
  name: string
  description: string | null
  image: string | null
  price: string | number
}

type ReservationService = {
  service_id: number
  quantity: number
  unit_price: string | number
  services: Service
}

type MenuItem = {
  id: number
  name: string
  price: string | number
  image: string | null
}

type OrderItem = {
  id: number
  menu_item_id: number
  quantity: number
  menu_items: MenuItem
}

type Order = {
  id: number
  status: string
  grand_total: string | number
  deposit_required: string | number
  created_at: string | null
  order_items: OrderItem[]
}

type Payment = {
  id: number
  amount: string | number
  payment_method: string
  purpose: string
  status: string
  order_id: string
  request_id: string
  partner_transaction_id: string | null
  gateway_response: string | null
  created_at: string | null
  paid_at: string | null
}

type UserInfo = {
  id: number
  full_name: string
  email: string
  phone: string
}

type ReservationDetail = {
  id: number
  user_id: number
  reservation_time: string
  reservation_endtime: string
  checked_in_at: string | null
  completed_at: string | null
  number_of_guests: number
  status: string
  created_at: string | null
  can_edit?: boolean
  users: UserInfo
  reservation_tables: ReservationTable[]
  reservation_services: ReservationService[]
  orders: Order[]
  payments: Payment[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
}

const modalVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

function fmtDT(iso?: string | null) {
  if (!iso) return '-'
  return iso.slice(0, 16).replace('T', ' ')
}

function money(v: string | number | null | undefined) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  if (!Number.isFinite(n)) return String(v ?? 0)
  return `${n.toLocaleString('vi-VN')} ₫`
}

function reservationStatusLabel(status?: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PENDING') return 'Chờ xác nhận'
  if (s === 'CONFIRMED') return 'Đã xác nhận'
  if (s === 'SEATED') return 'Đã vào bàn'
  if (s === 'COMPLETED') return 'Hoàn thành'
  if (s === 'CANCELLED') return 'Đã huỷ'
  if (s === 'NO_SHOW') return 'Không đến'
  return status || '-'
}

function reservationStatusClass(status?: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PENDING') return 'rhd-badge rhd-badge-warning'
  if (s === 'CONFIRMED') return 'rhd-badge rhd-badge-primary'
  if (s === 'SEATED') return 'rhd-badge rhd-badge-info'
  if (s === 'COMPLETED') return 'rhd-badge rhd-badge-success'
  if (s === 'CANCELLED') return 'rhd-badge rhd-badge-danger'
  if (s === 'NO_SHOW') return 'rhd-badge rhd-badge-dark'
  return 'rhd-badge rhd-badge-secondary'
}

function paymentStatusClass(status?: string) {
  const s = (status || '').toUpperCase()
  if (s === 'SUCCESS') return 'rhd-badge rhd-badge-success'
  if (s === 'PENDING') return 'rhd-badge rhd-badge-warning'
  if (s === 'FAILED') return 'rhd-badge rhd-badge-danger'
  return 'rhd-badge rhd-badge-secondary'
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

export default function ReservationHistoryDetailClient() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReservationDetail | null>(null)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [showTablesModal, setShowTablesModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/reservations/historys/${id}`, {
          cache: 'no-store',
          credentials: 'include',
        })

        const text = await res.text()
        let json: any = null
        try {
          json = text ? JSON.parse(text) : null
        } catch {}

        if (!res.ok) {
          throw new Error(json?.message || `Failed (${res.status})`)
        }

        if (!mounted) return
        setData(json as ReservationDetail)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? 'Failed to load reservation detail')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    if (!showPaymentsModal && !showTablesModal && !showCancelModal) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prev
    }
  }, [showPaymentsModal, showTablesModal, showCancelModal])

  const order = useMemo(() => data?.orders?.[0] ?? null, [data])

  const paidTotal = useMemo(() => {
    if (!data?.payments?.length) return 0
    return data.payments.reduce((sum, p) => {
      const n = typeof p.amount === 'string' ? Number(p.amount) : p.amount
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [data])

  const isPending = useMemo(() => {
    return (data?.status || '').toUpperCase() === 'PENDING'
  }, [data])

  const canCancel = useMemo(() => {
    const s = (data?.status || '').toUpperCase()
    return s === 'PENDING' || s === 'CONFIRMED'
  }, [data])

  async function handleCancelReservation() {
    if (!data?.id || canceling) return

    try {
      setCanceling(true)
      setCancelError(null)

      const res = await fetch(`/api/reservations/historys/${data.id}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
      })

      const text = await res.text()
      let json: any = null

      try {
        json = text ? JSON.parse(text) : null
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || `Hủy đơn thất bại (${res.status})`)
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              status: 'CANCELLED',
              orders: (prev.orders || []).map((o) => ({
                ...o,
                status: 'CLOSED',
              })),
            }
          : prev,
      )

      setShowCancelModal(false)
      setCancelError(null)
      router.refresh()
    } catch (e: any) {
      setCancelError(e?.message ?? 'Có lỗi xảy ra khi hủy đơn')
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="rhd-page">
        <div className="container py-4">
          <motion.div
            className="rhd-state-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div className="rhd-state-body">
              <motion.div
                className="rhd-spinner"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="rhd-state-title">Đang tải chi tiết đặt bàn</div>
                <div className="rhd-state-text">
                  Vui lòng chờ trong giây lát...
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rhd-page">
        <div className="container py-4">
          <motion.div
            className="rhd-state-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div className="rhd-state-stack">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Link href="/reservation-history" className="rhd-link-back">
                  ← Quay lại lịch sử
                </Link>
              </motion.div>

              <motion.div
                className="rhd-alert-danger"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02, x: 5 }}
              >
                {error}
              </motion.div>

              <motion.button
                className="rhd-btn rhd-btn-primary"
                onClick={() => router.refresh()}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Thử lại
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rhd-page">
        <div className="container py-4">
          <motion.div
            className="rhd-state-card"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <div className="rhd-state-stack">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Link href="/reservation-history" className="rhd-link-back">
                  ← Quay lại lịch sử
                </Link>
              </motion.div>

              <motion.div
                className="rhd-alert-warning"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                Không có dữ liệu.
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="rhd-page">
      <div className="container py-4">
        <motion.div
          className="rhd-topbar"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            whileHover={{ x: -5 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Link href="/reservation-history" className="rhd-link-back">
              ← Quay lại lịch sử
            </Link>
          </motion.div>

          <motion.span
            className={reservationStatusClass(data.status)}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.1 }}
          >
            {reservationStatusLabel(data.status)}
          </motion.span>
        </motion.div>

        {cancelError && (
          <motion.div
            className="rhd-alert-danger mt-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {cancelError}
          </motion.div>
        )}

        <motion.div
          className="rhd-hero"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="rhd-kicker"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              Chi tiết đặt bàn
            </motion.div>
            <h1 className="rhd-title">Reservation #{data.id}</h1>
            <p className="rhd-subtitle">
              Theo dõi thông tin đặt bàn, thanh toán và món đặt trước của bạn.
            </p>
          </motion.div>

          {(isPending || canCancel) && (
            <motion.div
              className="rhd-hero-actions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {isPending && (
                <motion.div
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={`/reservation/${data.id}/edit`}
                    className="rhd-btn rhd-btn-secondary"
                  >
                    Chỉnh sửa
                  </Link>
                </motion.div>
              )}

              {isPending && (
                <motion.div
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href={
                      order?.id
                        ? `/payment?order_id=${order.id}`
                        : `/payment?reservation_id=${data.id}`
                    }
                    className="rhd-btn rhd-btn-primary"
                  >
                    Thanh toán
                  </Link>
                </motion.div>
              )}

              {canCancel && (
                <motion.div
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button
                    type="button"
                    className="rhd-btn rhd-btn-danger"
                    onClick={() => setShowCancelModal(true)}
                    disabled={canceling}
                  >
                    {canceling ? 'Đang hủy...' : 'Hủy đơn'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="row g-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="col-12 col-lg-7">
            <motion.div
              className="rhd-card"
              variants={cardVariants}
              whileHover="hover"
            >
              <div className="rhd-card-body">
                <motion.div
                  className="rhd-card-title"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  Thông tin đặt bàn
                </motion.div>

                <div className="row g-3">
                  {[
                    {
                      label: 'Thời gian đặt bàn',
                      value: fmtDT(data.reservation_time),
                    },
                    {
                      label: 'Kết thúc',
                      value: fmtDT(data.reservation_endtime),
                    },
                    { label: 'Số lượng khách', value: data.number_of_guests },
                    { label: 'Tạo lúc', value: fmtDT(data.created_at) },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className="col-12 col-md-6"
                      variants={itemVariants}
                    >
                      <motion.div
                        className="rhd-info-box"
                        whileHover={{ y: -2, scale: 1.02 }}
                      >
                        <div className="rhd-info-label">{item.label}</div>
                        <div className="rhd-info-value">{item.value}</div>
                      </motion.div>
                    </motion.div>
                  ))}

                  <motion.div className="col-12" variants={itemVariants}>
                    <motion.div
                      className="rhd-info-box"
                      whileHover={{ y: -2, scale: 1.02 }}
                    >
                      <div className="rhd-info-label">Khách hàng</div>
                      <div className="rhd-info-value">
                        {data.users?.full_name} • {data.users?.phone}
                      </div>
                      <div className="rhd-info-sub">{data.users?.email}</div>
                    </motion.div>
                  </motion.div>
                </div>

                <motion.div className="rhd-divider" variants={itemVariants} />

                <motion.div
                  className="rhd-section-title"
                  variants={itemVariants}
                >
                  Bàn đã đặt
                </motion.div>

                {data.reservation_tables?.length ? (
                  <div className="rhd-chip-list">
                    {data.reservation_tables.slice(0, 2).map((t, index) => (
                      <motion.span
                        key={t.table_id}
                        className="rhd-chip"
                        variants={itemVariants}
                        whileHover={{ y: -3, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                      >
                        {t.restaurant_tables.table_name}
                        {' · '}
                        {t.restaurant_tables.table_types?.name ?? '—'}
                        {' · '}
                        {t.restaurant_tables.capacity} chỗ
                      </motion.span>
                    ))}

                    {data.reservation_tables.length > 2 && (
                      <motion.div
                        className="rhd-chip-actions"
                        variants={itemVariants}
                      >
                        <motion.button
                          type="button"
                          className="rhd-btn rhd-btn-secondary rhd-btn-inline"
                          onClick={() => setShowTablesModal(true)}
                          whileHover={{ y: -2, scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Xem tất cả ({data.reservation_tables.length})
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    className="rhd-empty-text"
                    variants={itemVariants}
                  >
                    Không có bàn.
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          <div className="col-12 col-lg-5">
            <motion.div
              className="rhd-card"
              variants={cardVariants}
              whileHover="hover"
            >
              <div className="rhd-card-body">
                <motion.div
                  className="rhd-card-title"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  Tóm tắt thanh toán
                </motion.div>

                {[
                  {
                    label: 'Grand total',
                    value: order ? money(order.grand_total) : '-',
                  },
                  {
                    label: 'Deposit required',
                    value: order ? money(order.deposit_required) : '-',
                  },
                  { label: 'Paid (all)', value: money(paidTotal) },
                  {
                    label: 'Order status',
                    value: order ? orderStatusLabel(order.status) : '-',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="rhd-summary-row"
                    variants={itemVariants}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </motion.div>
                ))}

                <motion.div className="rhd-divider" variants={itemVariants} />

                <motion.div
                  className="rhd-section-title"
                  variants={itemVariants}
                >
                  Thanh toán
                </motion.div>

                {data.payments?.length ? (
                  <>
                    <div className="rhd-payment-preview">
                      <div className="rhd-payment-list rhd-payment-list--preview">
                        {data.payments.slice(0, 1).map((p) => (
                          <motion.div
                            key={p.id}
                            className="rhd-payment-item"
                            variants={itemVariants}
                            whileHover={{ y: -2, scale: 1.02 }}
                          >
                            <div className="rhd-payment-main">
                              <div className="rhd-payment-title">
                                #{p.id} • {p.purpose}
                              </div>
                              <div className="rhd-payment-sub">
                                {p.payment_method} • {fmtDT(p.created_at)}
                              </div>
                            </div>

                            <div className="rhd-payment-side">
                              <motion.span
                                className={paymentStatusClass(p.status)}
                              >
                                {paymentStatusLabel(p.status)}
                              </motion.span>
                              <div className="rhd-payment-amount">
                                {money(p.amount)}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {data.payments.length > 1 && (
                      <motion.div
                        className="rhd-payment-actions"
                        variants={itemVariants}
                      >
                        <motion.button
                          type="button"
                          className="rhd-btn rhd-btn-secondary"
                          onClick={() => setShowPaymentsModal(true)}
                          whileHover={{ y: -2, scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Xem tất cả ({data.payments.length})
                        </motion.button>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <motion.div
                    className="rhd-empty-text"
                    variants={itemVariants}
                  >
                    Chưa có thanh toán.
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="rhd-card mt-3"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="rhd-card-body">
            <motion.div
              className="rhd-card-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
            >
              Dịch vụ đi kèm
            </motion.div>

            {data.reservation_services?.length ? (
              <motion.div className="table-responsive" variants={itemVariants}>
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th className="text-end">Đơn giá</th>
                      <th className="text-end">Số lượng</th>
                      <th className="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reservation_services.map((s, index) => {
                      const unit =
                        typeof s.unit_price === 'string'
                          ? Number(s.unit_price)
                          : s.unit_price
                      const sub =
                        (Number.isFinite(unit) ? unit : 0) * (s.quantity ?? 0)

                      return (
                        <motion.tr
                          key={s.service_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.05 }}
                          whileHover={{
                            scale: 1.01,
                            backgroundColor: 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <td>{s.services?.name}</td>
                          <td className="text-end">{money(s.unit_price)}</td>
                          <td className="text-end">{s.quantity}</td>
                          <td className="text-end">{money(sub)}</td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div className="rhd-empty-text" variants={itemVariants}>
                Không có service.
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="rhd-card mt-3"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="rhd-card-body">
            <motion.div
              className="rhd-card-title"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 }}
            >
              Món đặt trước
            </motion.div>

            {order?.order_items?.length ? (
              <motion.div className="table-responsive" variants={itemVariants}>
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Món</th>
                      <th className="text-end">Giá</th>
                      <th className="text-end">Số lượng</th>
                      <th className="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items.map((it, index) => {
                      const price =
                        typeof it.menu_items.price === 'string'
                          ? Number(it.menu_items.price)
                          : it.menu_items.price
                      const sub =
                        (Number.isFinite(price) ? price : 0) *
                        (it.quantity ?? 0)

                      return (
                        <motion.tr
                          key={it.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + index * 0.05 }}
                          whileHover={{
                            scale: 1.01,
                            backgroundColor: 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <td>{it.menu_items?.name}</td>
                          <td className="text-end">
                            {money(it.menu_items?.price)}
                          </td>
                          <td className="text-end">{it.quantity}</td>
                          <td className="text-end">{money(sub)}</td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div className="rhd-empty-text" variants={itemVariants}>
                Không có món đặt trước.
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showTablesModal && (
          <motion.div
            className="rhd-modal-backdrop"
            onClick={() => setShowTablesModal(false)}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="rhd-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rhd-modal__header">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="rhd-modal__kicker">Thông tin bàn</div>
                  <h3 className="rhd-modal__title">Tất cả bàn đã đặt</h3>
                </motion.div>

                <motion.button
                  type="button"
                  className="rhd-modal__close"
                  onClick={() => setShowTablesModal(false)}
                  aria-label="Đóng popup"
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>

              <motion.div
                className="rhd-modal__body"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="rhd-chip-list rhd-chip-list--modal">
                  {data.reservation_tables.map((t) => (
                    <motion.div
                      key={t.table_id}
                      className="rhd-table-item"
                      variants={itemVariants}
                      whileHover={{ y: -2, scale: 1.02 }}
                    >
                      <div className="rhd-table-item__name">
                        {t.restaurant_tables.table_name}
                      </div>
                      <div className="rhd-table-item__meta">
                        {t.restaurant_tables.table_types?.name ?? '—'} •{' '}
                        {t.restaurant_tables.capacity} chỗ
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="rhd-modal__footer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.button
                  type="button"
                  className="rhd-btn rhd-btn-secondary"
                  onClick={() => setShowTablesModal(false)}
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Đóng
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentsModal && (
          <motion.div
            className="rhd-modal-backdrop"
            onClick={() => setShowPaymentsModal(false)}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="rhd-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rhd-modal__header">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="rhd-modal__kicker">Lịch sử giao dịch</div>
                  <h3 className="rhd-modal__title">Tất cả thanh toán</h3>
                </motion.div>

                <motion.button
                  type="button"
                  className="rhd-modal__close"
                  onClick={() => setShowPaymentsModal(false)}
                  aria-label="Đóng popup"
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>

              <motion.div
                className="rhd-modal__body"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="rhd-payment-list rhd-payment-list--modal">
                  {data.payments.map((p) => (
                    <motion.div
                      key={p.id}
                      className="rhd-payment-item"
                      variants={itemVariants}
                      whileHover={{ y: -2, scale: 1.02 }}
                    >
                      <div className="rhd-payment-main">
                        <div className="rhd-payment-title">
                          #{p.id} • {p.purpose}
                        </div>
                        <div className="rhd-payment-sub">
                          {p.payment_method} • {fmtDT(p.created_at)}
                        </div>
                        {p.paid_at && (
                          <motion.div
                            className="rhd-payment-sub"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            Thanh toán lúc: {fmtDT(p.paid_at)}
                          </motion.div>
                        )}
                      </div>

                      <div className="rhd-payment-side">
                        <motion.span className={paymentStatusClass(p.status)}>
                          {paymentStatusLabel(p.status)}
                        </motion.span>
                        <div className="rhd-payment-amount">
                          {money(p.amount)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="rhd-modal__footer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.button
                  type="button"
                  className="rhd-btn rhd-btn-secondary"
                  onClick={() => setShowPaymentsModal(false)}
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Đóng
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CancelReservationModal
        open={showCancelModal}
        loading={canceling}
        reservationCode={data?.id}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelReservation}
      />
    </div>
  )
}
