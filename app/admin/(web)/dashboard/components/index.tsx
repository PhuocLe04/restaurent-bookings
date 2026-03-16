'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './index.css'

type Quick = 'today' | '7d' | '30d'

type DashboardResponse = {
  range: {
    quick: Quick | 'custom'
    from: string
    to: string
  }
  kpi: {
    reservationsTotal: number
    reservationsByStatus: Record<string, number>
    totalGuests: number
    estimatedRevenue: number
    cashIn: number
    depositSuccessRate: number
    noShow: number
    resWithDepositSuccess?: number
  }
  charts: {
    bookingsLine: Array<{
      date: string
      total: number
      completed: number
    }>
    bookingsStacked: Array<Record<string, any>>
    moneyLine: Array<{
      date: string
      revenue: number
      cashIn: number
    }>
    paymentDonut: Array<{
      method: string
      amount: number
    }>
    paymentPurposeDonut?: Array<{
      purpose: string
      amount: number
    }>
  }
  meta: {
    statusKeys: string[]
  }
}

const DEFAULT_STATUS_KEYS = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]

const TABLE_PAGE_SIZE = 10

function normalizeStatus(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase()
}

function money(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}

function compactMoney(value: number | string | null | undefined) {
  const n = Number(value || 0)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function percent(value: number | string | null | undefined) {
  return `${Number(value || 0).toLocaleString('vi-VN')}%`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  const s = String(value)

  if (s.length >= 10 && s.includes('-')) {
    const y = s.slice(0, 4)
    const m = s.slice(5, 7)
    const d = s.slice(8, 10)
    return `${d}/${m}/${y}`
  }

  if (/^\d{2}\/\d{2}$/.test(s)) {
    return s
  }

  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return s
  return dt.toLocaleDateString('vi-VN')
}

function shortDate(value: string | null | undefined) {
  if (!value) return ''

  const s = String(value)

  if (s.length >= 10 && s.includes('-')) {
    const m = s.slice(5, 7)
    const d = s.slice(8, 10)
    return `${d}/${m}`
  }

  if (/^\d{2}\/\d{2}$/.test(s)) {
    return s
  }

  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return s
  return `${String(dt.getDate()).padStart(2, '0')}/${String(
    dt.getMonth() + 1,
  ).padStart(2, '0')}`
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: any[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const rawDate = payload[0]?.payload?.date

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{formatDate(rawDate)}</div>
      <div className="chart-tooltip-list">
        {payload.map((entry, idx) => (
          <div key={idx} className="chart-tooltip-row">
            <span>{entry.name}</span>
            <strong>{money(entry.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

const PIE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#16a34a',
  '#ea580c',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#db2777',
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#2563eb',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
  NO_SHOW: '#7c3aed',
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [quick, setQuick] = useState<Quick>('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [tablePage, setTablePage] = useState(1)

  const [data, setData] = useState<DashboardResponse>({
    range: {
      quick: 'today',
      from: '',
      to: '',
    },
    kpi: {
      reservationsTotal: 0,
      reservationsByStatus: {},
      totalGuests: 0,
      estimatedRevenue: 0,
      cashIn: 0,
      depositSuccessRate: 0,
      noShow: 0,
      resWithDepositSuccess: 0,
    },
    charts: {
      bookingsLine: [],
      bookingsStacked: [],
      moneyLine: [],
      paymentDonut: [],
      paymentPurposeDonut: [],
    },
    meta: {
      statusKeys: [],
    },
  })

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (from && to) {
      p.set('from', from)
      p.set('to', to)
    } else {
      p.set('quick', quick)
    }
    return p.toString()
  }, [quick, from, to])

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/admin/api/dashboard?${query}`, {
        cache: 'no-store',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể tải dashboard')
      }

      setData(json)
      setTablePage(1)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [query])

  const bookingsLineData = data.charts.bookingsLine.map((x) => ({
    ...x,
    label: shortDate(String(x.date)),
  }))

  const moneyLineData = data.charts.moneyLine.map((x) => ({
    ...x,
    label: shortDate(String(x.date)),
  }))

  const normalizedStatusKeys = useMemo(() => {
    const set = new Set<string>(DEFAULT_STATUS_KEYS)
    for (const key of data.meta.statusKeys || []) {
      set.add(normalizeStatus(key))
    }
    return Array.from(set)
  }, [data.meta.statusKeys])

  const normalizedReservationsByStatus = useMemo(() => {
    const result: Record<string, number> = {}
    for (const key of normalizedStatusKeys) result[key] = 0

    for (const [key, value] of Object.entries(
      data.kpi.reservationsByStatus || {},
    )) {
      const normalized = normalizeStatus(key)
      result[normalized] = (result[normalized] || 0) + Number(value || 0)
    }

    return result
  }, [data.kpi.reservationsByStatus, normalizedStatusKeys])

  const bookingsStackedData = useMemo(() => {
    return data.charts.bookingsStacked.map((row) => {
      const normalizedRow: Record<string, any> = {
        date: row.date,
        label: shortDate(String(row.date)),
      }

      for (const key of normalizedStatusKeys) {
        normalizedRow[key] = 0
      }

      for (const [key, value] of Object.entries(row)) {
        if (key === 'date' || key === 'label') continue
        const normalized = normalizeStatus(key)
        normalizedRow[normalized] =
          (normalizedRow[normalized] || 0) + Number(value || 0)
      }

      return normalizedRow
    })
  }, [data.charts.bookingsStacked, normalizedStatusKeys])

  const paymentMethodData = data.charts.paymentDonut.map((x) => ({
    name: x.method,
    value: Number(x.amount || 0),
  }))

  const paymentPurposeData = (data.charts.paymentPurposeDonut || []).map(
    (x) => ({
      name: x.purpose,
      value: Number(x.amount || 0),
    }),
  )

  const totalTablePages = Math.max(
    1,
    Math.ceil(bookingsStackedData.length / TABLE_PAGE_SIZE),
  )

  const paginatedBookingsTable = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE
    const end = start + TABLE_PAGE_SIZE
    return bookingsStackedData.slice(start, end)
  }, [bookingsStackedData, tablePage])

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages)
    }
  }, [tablePage, totalTablePages])

  return (
    <div className="dashboard-page">
      <div className="dashboard-head">
        <div>
          <h1 className="admin-title">Dashboard tổng quan</h1>
        </div>

        <Link href="/admin/analytics" className="dashboard-link">
          Mở Thống kê →
        </Link>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-section-title">Bộ lọc thời gian</div>

        <div className="dashboard-filters">
          <select
            className="dashboard-input"
            value={quick}
            onChange={(e) => {
              setQuick(e.target.value as Quick)
              setFrom('')
              setTo('')
            }}
          >
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
          </select>

          <input
            type="date"
            className="dashboard-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <input
            type="date"
            className="dashboard-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          <button className="dashboard-btn" onClick={loadData}>
            Tải lại
          </button>
        </div>

        <div className="dashboard-range">
          Khoảng dữ liệu:{' '}
          <strong>
            {formatDate(data.range.from)} - {formatDate(data.range.to)}
          </strong>
        </div>
      </div>

      {error ? <div className="dashboard-error">{error}</div> : null}
      {loading ? (
        <div className="dashboard-loading">Đang tải dữ liệu...</div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="dashboard-kpi-grid">
            <div className="dashboard-kpi-card accent-blue">
              <div className="dashboard-kpi-label">Số đặt bàn</div>
              <div className="dashboard-kpi-value">
                {data.kpi.reservationsTotal}
              </div>
            </div>

            <div className="dashboard-kpi-card accent-green">
              <div className="dashboard-kpi-label">Khách phục vụ</div>
              <div className="dashboard-kpi-value">{data.kpi.totalGuests}</div>
            </div>

            <div className="dashboard-kpi-card accent-purple">
              <div className="dashboard-kpi-label">Tiền cần thu</div>
              <div className="dashboard-kpi-value">
                {money(data.kpi.estimatedRevenue)}
              </div>
            </div>

            <div className="dashboard-kpi-card accent-orange">
              <div className="dashboard-kpi-label">Tiền đã thu</div>
              <div className="dashboard-kpi-value">
                {money(data.kpi.cashIn)}
              </div>
            </div>

            <div className="dashboard-kpi-card accent-indigo">
              <div className="dashboard-kpi-label">Tỷ lệ cọc thành công</div>
              <div className="dashboard-kpi-value">
                {percent(data.kpi.depositSuccessRate)}
              </div>
            </div>

            <div className="dashboard-kpi-card accent-red">
              <div className="dashboard-kpi-label">No-show / late check-in</div>
              <div className="dashboard-kpi-value">{data.kpi.noShow}</div>
            </div>
          </div>

          <div className="dashboard-grid dashboard-grid-2">
            <div className="dashboard-card">
              <div className="dashboard-section-title">Đặt bàn theo ngày</div>
              <div className="dashboard-chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={bookingsLineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Tổng booking"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Booking hoàn thành"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-section-title">
                Tiền cần thu & tiền đã thu
              </div>
              <div className="dashboard-chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={moneyLineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(v) => compactMoney(v)} />
                    <Tooltip
                      formatter={(value: any, name?: string) => [
                        money(value),
                        name,
                      ]}
                      labelFormatter={(_, payload) => {
                        const rawDate = payload?.[0]?.payload?.date
                        return formatDate(rawDate)
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Tiền cần thu"
                      stroke="#7c3aed"
                      fill="#c4b5fd"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="cashIn"
                      name="Tiền đã thu"
                      stroke="#ea580c"
                      fill="#fdba74"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="dashboard-grid dashboard-grid-2">
            <div className="dashboard-card">
              <div className="dashboard-section-title">
                Booking theo trạng thái
              </div>
              <div className="dashboard-chart-box">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={bookingsStackedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(_, payload) => {
                        const rawDate = payload?.[0]?.payload?.date
                        return formatDate(rawDate)
                      }}
                    />
                    <Legend />
                    {normalizedStatusKeys.map((status) => (
                      <Bar
                        key={status}
                        dataKey={status}
                        stackId="booking"
                        fill={STATUS_COLORS[status] || '#94a3b8'}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-section-title">
                Breakdown theo trạng thái
              </div>
              <div className="dashboard-status-grid">
                {normalizedStatusKeys.map((status) => (
                  <div key={status} className="dashboard-status-item">
                    <div className="dashboard-status-name">{status}</div>
                    <div className="dashboard-status-value">
                      {normalizedReservationsByStatus[status] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard-grid dashboard-grid-2">
            <div className="dashboard-card">
              <div className="dashboard-section-title">
                Cơ cấu thanh toán theo phương thức
              </div>
              <div className="dashboard-chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {paymentMethodData.map((_, index) => (
                        <Cell
                          key={`method-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => money(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-section-title">
                Cơ cấu thanh toán theo mục đích
              </div>
              <div className="dashboard-chart-box">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={paymentPurposeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {paymentPurposeData.map((_, index) => (
                        <Cell
                          key={`purpose-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => money(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-section-title">
              Bảng booking theo trạng thái từng ngày
            </div>

            <div className="dashboard-table-info">
              Hiển thị{' '}
              <strong>
                {bookingsStackedData.length
                  ? (tablePage - 1) * TABLE_PAGE_SIZE + 1
                  : 0}
              </strong>{' '}
              -{' '}
              <strong>
                {Math.min(
                  tablePage * TABLE_PAGE_SIZE,
                  bookingsStackedData.length,
                )}
              </strong>{' '}
              trên tổng <strong>{bookingsStackedData.length}</strong> dòng
            </div>

            <div className="dashboard-table-wrap dashboard-table-wrap-y">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    {normalizedStatusKeys.map((status) => (
                      <th key={status}>{status}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookingsTable.map((row, idx) => (
                    <tr key={`${row.date}-${idx}`}>
                      <td>{formatDate(row.date)}</td>
                      {normalizedStatusKeys.map((status) => (
                        <td key={status}>{row[status] || 0}</td>
                      ))}
                    </tr>
                  ))}

                  {!paginatedBookingsTable.length && (
                    <tr>
                      <td colSpan={normalizedStatusKeys.length + 1}>
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {bookingsStackedData.length > TABLE_PAGE_SIZE ? (
              <div className="dashboard-pagination">
                <button
                  className="dashboard-page-btn"
                  onClick={() => setTablePage(1)}
                  disabled={tablePage === 1}
                >
                  «
                </button>

                <button
                  className="dashboard-page-btn"
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                >
                  ‹
                </button>

                <div className="dashboard-page-indicator">
                  Trang <strong>{tablePage}</strong> /{' '}
                  <strong>{totalTablePages}</strong>
                </div>

                <button
                  className="dashboard-page-btn"
                  onClick={() =>
                    setTablePage((p) => Math.min(totalTablePages, p + 1))
                  }
                  disabled={tablePage === totalTablePages}
                >
                  ›
                </button>

                <button
                  className="dashboard-page-btn"
                  onClick={() => setTablePage(totalTablePages)}
                  disabled={tablePage === totalTablePages}
                >
                  »
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
