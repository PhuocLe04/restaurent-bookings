'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import '../analytics.css'

type KPI = {
  total_service_quantity: number
  total_service_revenue: number | string
  reservations_with_services: number
}

type ServiceRevenueByDay = {
  date: string
  revenue: number | string
}

type TopService = {
  service_id: number
  service_name: string
  total_quantity: number
  total_revenue: number | string
}

type Combo = {
  id: number
  title: string
  sale_price: number | string
  total_origin_price: number | string
  discount_percent: number | string
  is_active: boolean
}

type ComboItem = {
  combo_id: number
  title: string
  total_menu_items: number
  total_services: number
  menu_items_value: number | string
  services_value: number | string
}

type ApiResponse = {
  kpis: KPI
  charts: {
    serviceRevenueByDay: ServiceRevenueByDay[]
  }
  tables: {
    topServices: TopService[]
    combos: Combo[]
    comboItems: ComboItem[]
  }
  note?: string[]
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

export default function UpsellAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [data, setData] = useState<ApiResponse>({
    kpis: {
      total_service_quantity: 0,
      total_service_revenue: 0,
      reservations_with_services: 0,
    },
    charts: {
      serviceRevenueByDay: [],
    },
    tables: {
      topServices: [],
      combos: [],
      comboItems: [],
    },
    note: [],
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
      const res = await fetch(`/admin/api/analytics/upsell?${query}`, {
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
          <div className="analytic-badge">Upsell Analytics</div>
          <h1 className="analytic-title">Thống kê dịch vụ & combo</h1>
          <p className="analytic-subtitle">
            Theo dõi dịch vụ bán chạy, doanh thu dịch vụ và các combo đang có
            trong hệ thống.
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
              <div className="analytic-kpi-label">Tổng SL dịch vụ</div>
              <div className="analytic-kpi-value">
                {data.kpis.total_service_quantity}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Tổng doanh thu dịch vụ</div>
              <div className="analytic-kpi-value">
                {money(data.kpis.total_service_revenue)}
              </div>
            </div>
            <div className="analytic-kpi-card">
              <div className="analytic-kpi-label">Reservation có dịch vụ</div>
              <div className="analytic-kpi-value">
                {data.kpis.reservations_with_services}
              </div>
            </div>
          </div>

          <div className="analytic-grid analytic-grid-2">
            <div className="analytic-card">
              <div className="analytic-section-title">
                Top services bán chạy
              </div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th>Số lượng</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.topServices.map((row) => (
                      <tr key={row.service_id}>
                        <td>{row.service_name}</td>
                        <td>{row.total_quantity}</td>
                        <td>{money(row.total_revenue)}</td>
                      </tr>
                    ))}
                    {!data.tables.topServices.length && (
                      <tr>
                        <td colSpan={3}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytic-card">
              <div className="analytic-section-title">
                Doanh thu dịch vụ theo ngày
              </div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.serviceRevenueByDay.map((row, i) => (
                      <tr key={i}>
                        <td>{fmtDate(row.date)}</td>
                        <td>{money(row.revenue)}</td>
                      </tr>
                    ))}
                    {!data.charts.serviceRevenueByDay.length && (
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
              <div className="analytic-section-title">Danh sách combo</div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên combo</th>
                      <th>Giá gốc</th>
                      <th>Giá bán</th>
                      <th>Giảm %</th>
                      <th>Hoạt động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.combos.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>{money(row.total_origin_price)}</td>
                        <td>{money(row.sale_price)}</td>
                        <td>{row.discount_percent || 0}%</td>
                        <td>{row.is_active ? 'Có' : 'Không'}</td>
                      </tr>
                    ))}
                    {!data.tables.combos.length && (
                      <tr>
                        <td colSpan={6}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytic-card">
              <div className="analytic-section-title">Cấu trúc combo</div>
              <div className="analytic-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Combo</th>
                      <th>Số món</th>
                      <th>Số dịch vụ</th>
                      <th>Giá trị món</th>
                      <th>Giá trị dịch vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.comboItems.map((row) => (
                      <tr key={row.combo_id}>
                        <td>{row.title}</td>
                        <td>{row.total_menu_items}</td>
                        <td>{row.total_services}</td>
                        <td>{money(row.menu_items_value)}</td>
                        <td>{money(row.services_value)}</td>
                      </tr>
                    ))}
                    {!data.tables.comboItems.length && (
                      <tr>
                        <td colSpan={5}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {!!data.note?.length && (
            <div className="analytic-card">
              <div className="analytic-section-title">Ghi chú</div>
              <div className="analytic-note-list">
                {data.note.map((item, idx) => (
                  <div key={idx} className="analytic-note">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
