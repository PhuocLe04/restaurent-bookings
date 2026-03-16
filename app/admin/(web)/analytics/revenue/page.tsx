'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import '../analytics.css'

type KPI = {
  total_revenue: number | string
  total_orders: number
  reservations_with_orders: number
  aov_per_reservation: number | string
  avg_revenue_per_guest: number | string
  total_guests: number
}

type RevenueByDay = {
  date: string
  revenue: number | string
  total_orders: number
}

type AovByDay = {
  date: string
  aov: number | string
}

type TopItem = {
  menu_item_id: number
  menu_item_name: string
  total_quantity: number
  total_revenue: number | string
}

type TopOrder = {
  id: number
  reservation_id: number
  customer_name: string
  status: string
  grand_total: number | string
  number_of_guests: number
  created_at: string
}

type ApiResponse = {
  kpis: KPI
  charts: {
    revenueByDay: RevenueByDay[]
    aovByDay: AovByDay[]
  }
  tables: {
    topItems: TopItem[]
    topOrders: TopOrder[]
  }
  note?: string
}

function money(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('vi-VN')
}

export default function RevenueAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [data, setData] = useState<ApiResponse>({
    kpis: {
      total_revenue: 0,
      total_orders: 0,
      reservations_with_orders: 0,
      aov_per_reservation: 0,
      avg_revenue_per_guest: 0,
      total_guests: 0,
    },
    charts: {
      revenueByDay: [],
      aovByDay: [],
    },
    tables: {
      topItems: [],
      topOrders: [],
    },
  })

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [from, to])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/admin/api/analytics/revenue?${query}`, {
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
          <div className="analytic-badge">Revenue / Orders</div>
          <h1 className="analytic-title">Thống kê doanh thu & đơn hàng</h1>
          <p className="analytic-subtitle">
            Theo dõi doanh thu, AOV, doanh thu theo ngày và các món bán chạy
            nhất.
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
              <div className="analytic-kpi-label">Tổng doanh thu</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.total_revenue)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng đơn hàng</div>
              <div className="analytic-kpi-value">{data.kpis.total_orders}</div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Số reservation có order</div>
              <div className="analytic-kpi-value">
                {data.kpis.reservations_with_orders}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">AOV / đặt bàn</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.aov_per_reservation)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">AOV / khách</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.avg_revenue_per_guest)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng khách</div>
              <div className="analytic-kpi-value">{data.kpis.total_guests}</div>
            </div>
          </div>

          <div className="analytic-grid analytic-grid-2">
            <div className="analytic-card">
              <div className="analytic-section-title">Doanh thu theo ngày</div>
              <div className="analytic-mini-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Doanh thu</th>
                      <th>Số đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.revenueByDay.map((row, i) => (
                      <tr key={i}>
                        <td>{fmtDate(row.date)}</td>
                        <td>{money(row.revenue)}</td>
                        <td>{row.total_orders}</td>
                      </tr>
                    ))}
                    {!data.charts.revenueByDay.length && (
                      <tr>
                        <td colSpan={3}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytic-card">
              <div className="analytic-section-title">AOV theo ngày</div>
              <div className="analytic-mini-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>AOV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.aovByDay.map((row, i) => (
                      <tr key={i}>
                        <td>{fmtDate(row.date)}</td>
                        <td>{money(row.aov)}</td>
                      </tr>
                    ))}
                    {!data.charts.aovByDay.length && (
                      <tr>
                        <td colSpan={2}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="analytic-grid analytic-grid-2">
            <div className="analytic-card">
              <div className="analytic-section-title">
                Top menu items bán chạy
              </div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Món</th>
                      <th>Số lượng</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.topItems.map((row) => (
                      <tr key={row.menu_item_id}>
                        <td>{row.menu_item_name}</td>
                        <td>{row.total_quantity}</td>
                        <td>{money(row.total_revenue)}</td>
                      </tr>
                    ))}
                    {!data.tables.topItems.length && (
                      <tr>
                        <td colSpan={3}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytic-card">
              <div className="analytic-section-title">Đơn hàng gần đây</div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Khách</th>
                      <th>Reservation</th>
                      <th>Khách đi</th>
                      <th>Trạng thái</th>
                      <th>Tổng tiền</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.topOrders.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.customer_name}</td>
                        <td>{row.reservation_id}</td>
                        <td>{row.number_of_guests}</td>
                        <td>{row.status}</td>
                        <td>{money(row.grand_total)}</td>
                        <td>{fmtDate(row.created_at)}</td>
                      </tr>
                    ))}
                    {!data.tables.topOrders.length && (
                      <tr>
                        <td colSpan={7}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {data.note ? <div className="analytic-note">{data.note}</div> : null}
        </>
      ) : null}
    </div>
  )
}
