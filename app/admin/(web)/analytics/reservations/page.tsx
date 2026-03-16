'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import '../analytics.css'
type ReservationRow = {
  id: number
  customer_name: string
  reservation_time: string
  reservation_endtime: string
  number_of_guests: number
  status: string
  tables: string
  order_total: number | string
  deposit_status: string
  deposit_paid: number | string
}

type HeatmapRow = {
  weekday_num: number
  weekday_name: string
  hour_of_day: number
  total_reservations: number
}

type RateRow = {
  date: string
  total: number
  cancelled?: number
  completed?: number
  cancel_rate?: number | string
  completion_rate?: number | string
}

type TopTableRow = {
  table_id: number
  table_name: string
  capacity: number
  used_count: number
}

type TopTableTypeRow = {
  table_type_id: number
  table_type_name: string
  used_count: number
}

type ApiResponse = {
  table: {
    items: ReservationRow[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  insights: {
    heatmap: HeatmapRow[]
    cancelRate: RateRow[]
    completionRate: RateRow[]
    topTables: TopTableRow[]
    topTableTypes: TopTableTypeRow[]
  }
}

function money(value: number | string | null | undefined) {
  const n = Number(value || 0)
  return n.toLocaleString('vi-VN') + ' đ'
}

function fmtDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('vi-VN')
}

export default function ReservationsAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [minGuests, setMinGuests] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [tableTypeId, setTableTypeId] = useState('')
  const [peakOnly, setPeakOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [data, setData] = useState<ApiResponse>({
    table: { items: [], total: 0, page: 1, limit: 10, totalPages: 1 },
    insights: {
      heatmap: [],
      cancelRate: [],
      completionRate: [],
      topTables: [],
      topTableTypes: [],
    },
  })

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    if (status) p.set('status', status)
    if (minGuests) p.set('minGuests', minGuests)
    if (maxGuests) p.set('maxGuests', maxGuests)
    if (tableTypeId) p.set('tableTypeId', tableTypeId)
    if (peakOnly) p.set('peakOnly', 'true')
    p.set('page', String(page))
    p.set('limit', '10')
    return p.toString()
  }, [from, to, status, minGuests, maxGuests, tableTypeId, peakOnly, page])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/admin/api/analytics/reservations?${query}`, {
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
          <div className="analytic-badge">Reservations Analytics</div>
          <h1 className="analytic-title">Thống kê đặt bàn</h1>
          <p className="analytic-subtitle">
            Theo dõi đặt bàn, giờ cao điểm, tỷ lệ hủy, tỷ lệ hoàn thành và mức
            độ sử dụng bàn.
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
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <input
            type="number"
            placeholder="Số khách từ"
            value={minGuests}
            onChange={(e) => setMinGuests(e.target.value)}
            className="analytic-input"
          />

          <input
            type="number"
            placeholder="Số khách đến"
            value={maxGuests}
            onChange={(e) => setMaxGuests(e.target.value)}
            className="analytic-input"
          />

          <input
            type="number"
            placeholder="Table type id"
            value={tableTypeId}
            onChange={(e) => setTableTypeId(e.target.value)}
            className="analytic-input"
          />

          <label className="analytic-check">
            <input
              type="checkbox"
              checked={peakOnly}
              onChange={(e) => setPeakOnly(e.target.checked)}
            />
            Chỉ giờ cao điểm
          </label>
        </div>
      </div>

      {error ? <div className="analytic-error">{error}</div> : null}
      {loading ? (
        <div className="analytic-loading">Đang tải dữ liệu...</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="analytic-grid analytic-grid-2">
            <div className="analytic-card">
              <div className="analytic-section-title">Tỷ lệ hủy theo ngày</div>
              <div className="analytic-mini-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Tổng</th>
                      <th>Hủy</th>
                      <th>Tỷ lệ hủy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.insights.cancelRate.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td>{fmtDateTime(row.date)}</td>
                        <td>{row.total}</td>
                        <td>{row.cancelled || 0}</td>
                        <td>{row.cancel_rate || 0}%</td>
                      </tr>
                    ))}
                    {!data.insights.cancelRate.length && (
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
                Tỷ lệ hoàn thành theo ngày
              </div>
              <div className="analytic-mini-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Tổng</th>
                      <th>Hoàn thành</th>
                      <th>Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.insights.completionRate.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td>{fmtDateTime(row.date)}</td>
                        <td>{row.total}</td>
                        <td>{row.completed || 0}</td>
                        <td>{row.completion_rate || 0}%</td>
                      </tr>
                    ))}
                    {!data.insights.completionRate.length && (
                      <tr>
                        <td colSpan={4}>Không có dữ liệu</td>
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
                Bàn được dùng nhiều nhất
              </div>
              <div className="analytic-mini-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Bàn</th>
                      <th>Sức chứa</th>
                      <th>Lượt dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.insights.topTables.slice(0, 10).map((row) => (
                      <tr key={row.table_id}>
                        <td>{row.table_name}</td>
                        <td>{row.capacity}</td>
                        <td>{row.used_count}</td>
                      </tr>
                    ))}
                    {!data.insights.topTables.length && (
                      <tr>
                        <td colSpan={3}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="analytic-card">
              <div className="analytic-section-title">Loại bàn phổ biến</div>
              <div className="analytic-mini-table-wrap">
                <table className="analytic-table">
                  <thead>
                    <tr>
                      <th>Loại bàn</th>
                      <th>Lượt dùng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.insights.topTableTypes.slice(0, 10).map((row) => (
                      <tr key={row.table_type_id}>
                        <td>{row.table_type_name}</td>
                        <td>{row.used_count}</td>
                      </tr>
                    ))}
                    {!data.insights.topTableTypes.length && (
                      <tr>
                        <td colSpan={2}>Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="analytic-card">
            <div className="analytic-section-title">Heatmap giờ cao điểm</div>
            <div className="analytic-mini-table-wrap">
              <table className="analytic-table">
                <thead>
                  <tr>
                    <th>Thứ</th>
                    <th>Giờ</th>
                    <th>Số lượt đặt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.insights.heatmap.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td>{row.weekday_name}</td>
                      <td>{row.hour_of_day}:00</td>
                      <td>{row.total_reservations}</td>
                    </tr>
                  ))}
                  {!data.insights.heatmap.length && (
                    <tr>
                      <td colSpan={3}>Không có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analytic-card">
            <div className="analytic-section-title">Danh sách đặt bàn</div>
            <div className="analytic-table-wrap">
              <table className="analytic-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Khách</th>
                    <th>Thời gian</th>
                    <th>Số khách</th>
                    <th>Trạng thái</th>
                    <th>Bàn</th>
                    <th>Tổng order</th>
                    <th>Tình trạng cọc</th>
                  </tr>
                </thead>
                <tbody>
                  {data.table.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.customer_name}</td>
                      <td>{fmtDateTime(item.reservation_time)}</td>
                      <td>{item.number_of_guests}</td>
                      <td>{item.status}</td>
                      <td>{item.tables || '-'}</td>
                      <td>{money(item.order_total)}</td>
                      <td>{item.deposit_status}</td>
                    </tr>
                  ))}
                  {!data.table.items.length && (
                    <tr>
                      <td colSpan={8}>Không có dữ liệu</td>
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
