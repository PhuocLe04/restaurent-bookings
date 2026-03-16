'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import '../analytics.css'

type KPI = {
  total_collected: number | string
  total_deposit_collected: number | string
  total_paid_success: number | string
  total_order_amount: number | string
  total_paid: number | string
  estimated_remaining: number | string
}

type FailRateRow = {
  payment_method: string
  total_attempts: number
  failed_count: number
  fail_rate: number | string
}

type PaymentRow = {
  id: number
  reservation_id: number
  user_name: string
  amount: number | string
  payment_method: string
  purpose: string
  status: string
  order_id: string
  request_id: string
  partner_transaction_id: string | null
  created_at: string
  paid_at: string | null
}

type DepositStatusRow = {
  reservation_id: number
  user_name: string
  order_total: number | string
  deposit_paid: number | string
  total_paid: number | string
  deposit_status: string
  remaining_amount: number | string
}

type ApiResponse = {
  kpis: KPI
  charts: {
    failRateByGateway: FailRateRow[]
  }
  table: {
    items: PaymentRow[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  reservationDepositStatus: DepositStatusRow[]
}

function money(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN')
}

export default function PaymentsAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [purpose, setPurpose] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<ApiResponse>({
    kpis: {
      total_collected: 0,
      total_deposit_collected: 0,
      total_paid_success: 0,
      total_order_amount: 0,
      total_paid: 0,
      estimated_remaining: 0,
    },
    charts: {
      failRateByGateway: [],
    },
    table: {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    reservationDepositStatus: [],
  })

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    if (status) p.set('status', status)
    if (purpose) p.set('purpose', purpose)
    if (paymentMethod) p.set('payment_method', paymentMethod)
    p.set('page', String(page))
    p.set('limit', '10')
    return p.toString()
  }, [from, to, status, purpose, paymentMethod, page])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/admin/api/analytics/payments?${query}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || 'Không thể tải dữ liệu')
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [query])

  return (
    <div className="analytic-page">
      <div className="analytic-topbar">
        <div>
          <div className="analytic-badge">Payments Analytics</div>
          <h1 className="analytic-title">Thống kê thanh toán & cọc</h1>
          <p className="analytic-subtitle">
            Theo dõi tiền đã thu, tiền cọc, phần còn lại và lịch sử giao dịch
            thanh toán.
          </p>
        </div>

        <Link href="/admin/analytics" className="analytic-back">
          ← Quay lại
        </Link>
      </div>

      <div className="analytic-card">
        <div className="analytic-section-title">Bộ lọc</div>
        <div className="analytic-filters">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="analytic-input"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="analytic-input"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="analytic-input"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">PENDING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </select>

          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="analytic-input"
          >
            <option value="">Tất cả mục đích</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="FINAL">FINAL</option>
          </select>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="analytic-input"
          >
            <option value="">Tất cả phương thức</option>
            <option value="MOMO">MOMO</option>
            <option value="CASH">CASH</option>
            <option value="VNPAY">VNPAY</option>
          </select>
        </div>
      </div>

      {error ? <div className="analytic-error">{error}</div> : null}
      {loading ? (
        <div className="analytic-loading">Đang tải dữ liệu...</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="analytic-kpi-grid">
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng đã thu</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.total_collected)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng tiền cọc đã thu</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.total_deposit_collected)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng order</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.total_order_amount)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng đã thanh toán</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.total_paid)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Còn lại ước tính</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.estimated_remaining)}
              </div>
            </div>
          </div>

          <div className="analytic-grid analytic-grid-2">
            <div className="analytic-card">
              <div className="analytic-section-title">
                Tỷ lệ payment fail theo gateway
              </div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Gateway</th>
                      <th>Tổng lượt</th>
                      <th>Fail</th>
                      <th>Tỷ lệ fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.failRateByGateway.map((row, i) => (
                      <tr key={i}>
                        <td>{row.payment_method}</td>
                        <td>{row.total_attempts}</td>
                        <td>{row.failed_count}</td>
                        <td>{row.fail_rate}%</td>
                      </tr>
                    ))}
                    {!data.charts.failRateByGateway.length && (
                      <tr>
                        <td colSpan={4}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytic-card">
              <div className="analytic-section-title">
                Theo dõi cọc theo reservation
              </div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Reservation</th>
                      <th>Khách</th>
                      <th>Order</th>
                      <th>Đã cọc</th>
                      <th>Đã trả</th>
                      <th>Còn lại</th>
                      <th>Trạng thái cọc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reservationDepositStatus.slice(0, 15).map((row) => (
                      <tr key={row.reservation_id}>
                        <td>{row.reservation_id}</td>
                        <td>{row.user_name}</td>
                        <td>{money(row.order_total)}</td>
                        <td>{money(row.deposit_paid)}</td>
                        <td>{money(row.total_paid)}</td>
                        <td>{money(row.remaining_amount)}</td>
                        <td>{row.deposit_status}</td>
                      </tr>
                    ))}
                    {!data.reservationDepositStatus.length && (
                      <tr>
                        <td colSpan={7}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="analytic-card">
            <div className="analytic-section-title">Bảng payments</div>
            <div className="analytic-table-wrap">
              <table className="analytic-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Reservation</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Order ID</th>
                    <th>Request ID</th>
                    <th>Created</th>
                    <th>Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.table.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.reservation_id}</td>
                      <td>{row.user_name}</td>
                      <td>{money(row.amount)}</td>
                      <td>{row.payment_method}</td>
                      <td>{row.purpose}</td>
                      <td>{row.status}</td>
                      <td>{row.order_id}</td>
                      <td>{row.request_id}</td>
                      <td>{fmtDateTime(row.created_at)}</td>
                      <td>{fmtDateTime(row.paid_at)}</td>
                    </tr>
                  ))}
                  {!data.table.items.length && (
                    <tr>
                      <td colSpan={11}>Không có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="analytic-pagination">
              <button
                className="analytic-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <span>
                Trang {data.table.page} / {data.table.totalPages}
              </span>
              <button
                className="analytic-btn"
                disabled={page >= data.table.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
