'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

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

  users: UserInfo
  reservation_tables: ReservationTable[]
  reservation_services: ReservationService[]
  orders: Order[]
  payments: Payment[]
}

function fmtDT(iso?: string | null) {
  if (!iso) return '-'
  // ổn định SSR/CSR: không dùng toLocale
  return iso.slice(0, 16).replace('T', ' ')
}

function money(v: string | number | null | undefined) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  if (!Number.isFinite(n)) return String(v ?? 0)
  return n.toLocaleString('vi-VN')
}

export default function ReservationHistoryDetailClient() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReservationDetail | null>(null)

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

  const order = useMemo(() => data?.orders?.[0] ?? null, [data])
  const paidTotal = useMemo(() => {
    if (!data?.payments?.length) return 0
    return data.payments.reduce((sum, p) => {
      const n = typeof p.amount === 'string' ? Number(p.amount) : p.amount
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [data])

  if (loading) {
    return (
      <div className="container py-4">
        <div className="alert alert-secondary mb-0">Đang tải chi tiết…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-4">
        <Link href="/table/history" className="text-decoration-none">
          ← Quay lại lịch sử
        </Link>

        <div className="alert alert-danger mt-3">{error}</div>

        <button
          className="btn btn-dark"
          onClick={() => router.refresh()}
          type="button"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container py-4">
        <Link href="/table/history" className="text-decoration-none">
          ← Quay lại lịch sử
        </Link>
        <div className="alert alert-warning mt-3 mb-0">Không có dữ liệu.</div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <Link href="/table/history" className="text-decoration-none">
          ← Quay lại lịch sử
        </Link>

        <span className="badge bg-secondary">{data.status}</span>
      </div>

      <h1 className="h4 mt-3 mb-2">Reservation #{data.id}</h1>

      {/* Summary */}
      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <div className="text-muted small">Reservation time</div>
                  <div className="fw-semibold">
                    {fmtDT(data.reservation_time)}
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="text-muted small">End time</div>
                  <div className="fw-semibold">
                    {fmtDT(data.reservation_endtime)}
                  </div>
                </div>

                <div className="col-12 col-md-6 mt-2">
                  <div className="text-muted small">Guests</div>
                  <div className="fw-semibold">{data.number_of_guests}</div>
                </div>

                <div className="col-12 col-md-6 mt-2">
                  <div className="text-muted small">Created</div>
                  <div className="fw-semibold">{fmtDT(data.created_at)}</div>
                </div>

                <div className="col-12 mt-2">
                  <div className="text-muted small">Customer</div>
                  <div className="fw-semibold">
                    {data.users?.full_name} • {data.users?.phone}
                  </div>
                  <div className="text-muted small">{data.users?.email}</div>
                </div>
              </div>

              <hr />

              <div className="fw-semibold mb-2">Tables</div>
              {data.reservation_tables?.length ? (
                <ul className="mb-0">
                  {data.reservation_tables.map((t) => (
                    <li key={t.table_id}>
                      <span className="fw-semibold">
                        {t.restaurant_tables.table_name}
                      </span>{' '}
                      <span className="text-muted">
                        ({t.restaurant_tables.table_types?.name ?? '—'} •{' '}
                        {t.restaurant_tables.capacity} chỗ)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted">Không có bàn.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="fw-semibold mb-2">Payment summary</div>

              <div className="d-flex justify-content-between">
                <span className="text-muted">Grand total</span>
                <span className="fw-semibold">
                  {order ? money(order.grand_total) : '-'}
                </span>
              </div>

              <div className="d-flex justify-content-between mt-2">
                <span className="text-muted">Deposit required</span>
                <span className="fw-semibold">
                  {order ? money(order.deposit_required) : '-'}
                </span>
              </div>

              <div className="d-flex justify-content-between mt-2">
                <span className="text-muted">Paid (all)</span>
                <span className="fw-semibold">{money(paidTotal)}</span>
              </div>

              <hr />

              <div className="fw-semibold mb-2">Payments</div>
              {data.payments?.length ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Purpose</th>
                        <th>Status</th>
                        <th className="text-end">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p) => (
                        <tr key={p.id}>
                          <td>#{p.id}</td>
                          <td>{p.purpose}</td>
                          <td>
                            <span className="badge bg-secondary">
                              {p.status}
                            </span>
                          </td>
                          <td className="text-end">{money(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted">Chưa có thanh toán.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <div className="fw-semibold mb-2">Services</div>
          {data.reservation_services?.length ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th className="text-end">Unit</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reservation_services.map((s) => {
                    const unit =
                      typeof s.unit_price === 'string'
                        ? Number(s.unit_price)
                        : s.unit_price
                    const sub =
                      (Number.isFinite(unit) ? unit : 0) * (s.quantity ?? 0)
                    return (
                      <tr key={s.service_id}>
                        <td>{s.services?.name}</td>
                        <td className="text-end">{money(s.unit_price)}</td>
                        <td className="text-end">{s.quantity}</td>
                        <td className="text-end">{money(sub)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted">Không có service.</div>
          )}
        </div>
      </div>

      {/* Order items */}
      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <div className="fw-semibold mb-2">Order items</div>

          {order?.order_items?.length ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((it) => {
                    const price =
                      typeof it.menu_items.price === 'string'
                        ? Number(it.menu_items.price)
                        : it.menu_items.price
                    const sub =
                      (Number.isFinite(price) ? price : 0) * (it.quantity ?? 0)
                    return (
                      <tr key={it.id}>
                        <td>{it.menu_items?.name}</td>
                        <td className="text-end">
                          {money(it.menu_items?.price)}
                        </td>
                        <td className="text-end">{it.quantity}</td>
                        <td className="text-end">{money(sub)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted">Không có món đặt trước.</div>
          )}
        </div>
      </div>
    </div>
  )
}
