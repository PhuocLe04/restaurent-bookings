'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  data: ReservationRow[]
}

function fmtDate(iso?: string) {
  if (!iso) return '-'
  return iso.slice(0, 16).replace('T', ' ')
}

export default function ReservationHistoryClient() {
  const [data, setData] = useState<ReservationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(
          `/api/reservations/historys?page=${page}&limit=5`,
          { cache: 'no-store', credentials: 'include' },
        )

        if (!res.ok) {
          const j = await res.json().catch(() => null)
          throw new Error(j?.message || 'Failed to load reservation history')
        }

        const json = (await res.json()) as HistoryResponse
        if (!mounted) return

        setData(json.data)
        setTotalPages(json.totalPages)
      } catch (e: any) {
        if (!mounted) return
        setError(e.message)
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
      <div className="container py-4">
        <div className="alert alert-secondary mb-0">
          Đang tải lịch sử đặt bàn…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
        <Link href="/login" className="btn btn-dark">
          Đi tới Login
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <h1 className="h4 mb-3">Reservation History</h1>

      {data.length === 0 ? (
        <div className="alert alert-warning">
          Bạn chưa có lịch sử đặt bàn nào.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Reservation Time</th>
                <th>Tables</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Total / Deposit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const order = r.orders?.[0]
                return (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>
                      {fmtDate(r.reservation_time)} <br />
                      <small className="text-muted">
                        → {fmtDate(r.reservation_endtime)}
                      </small>
                    </td>
                    <td>
                      {r.reservation_tables.map((t, i) => (
                        <div key={i}>
                          {t.restaurant_tables.table_name}{' '}
                          <small className="text-muted">
                            ({t.restaurant_tables.table_types?.name})
                          </small>
                        </div>
                      ))}
                    </td>
                    <td>{r.number_of_guests}</td>
                    <td>
                      <span className="badge bg-secondary">{r.status}</span>
                    </td>
                    <td>
                      {order ? (
                        <>
                          <div>Total: {order.grand_total}</div>
                          <div className="text-muted small">
                            Deposit: {order.deposit_required}
                          </div>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/reservation-history/${r.id}`}
                        className="btn btn-sm btn-outline-dark"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Prev
        </button>

        <span className="small text-muted">
          Page {page} / {totalPages}
        </span>

        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
