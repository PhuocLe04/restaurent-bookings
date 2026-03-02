'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ReservationForm, type ReservationFormValue } from './components'

type ReservationRow = {
  id: number
  user_id: number
  reservation_time: string
  reservation_endtime: string
  number_of_guests: number
  status: string
  created_at: string | null
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
  reservation_tables?: Array<{
    table_id: number
    restaurant_tables?: {
      id: number
      table_name: string
      capacity: number
    } | null
  }>
  reservation_services?: Array<{
    service_id: number
    quantity: number
    unit_price: any
    services?: { id: number; name: string; price: any } | null
  }>
  orders?: any[]
  payments?: any[]
}

type ListResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  data: ReservationRow[]
}

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']

async function readApiError(res: Response) {
  const ct = res.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) {
      const j = await res.json()
      return j?.message || `Request failed (HTTP ${res.status})`
    }
    const txt = await res.text()
    if (ct.includes('text/html') || txt.trim().startsWith('<!DOCTYPE html')) {
      return `API trả về HTML (có thể 404 route / bị redirect / thiếu auth). HTTP ${res.status}`
    }
    return txt?.slice(0, 300) || `Request failed (HTTP ${res.status})`
  } catch {
    return `Request failed (HTTP ${res.status})`
  }
}

export default function ReservationsClient() {
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [status, setStatus] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ReservationRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string>('')

  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  const query = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('limit', String(limit))
    if (status) sp.set('status', status)
    if (userId.trim()) sp.set('user_id', userId.trim()) // ✅ đúng param
    return sp.toString()
  }, [page, limit, status, userId])

  const load = async () => {
    try {
      setError('')
      setLoading(true)

      const res = await fetch(`/admin/api/reservation?${query}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const msg = await readApiError(res)
        throw new Error(msg)
      }

      const data = (await res.json()) as ListResponse
      setRows(data.data ?? [])
      setTotalPages(data.totalPages ?? 1)
    } catch (e: any) {
      setError(String(e?.message ?? e))
      setRows([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const handleDelete = async (id: number) => {
    const ok = confirm(`Delete reservation #${id}?`)
    if (!ok) return
    try {
      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await readApiError(res))
      await load()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
  }

  const handleCreate = async (value: ReservationFormValue) => {
    try {
      setCreating(true)
      const res = await fetch('/admin/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      })
      if (!res.ok) throw new Error(await readApiError(res))
      setOpenCreate(false)
      setPage(1)
      await load()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rsv-page">
      <div className="rsv-head">
        <div>
          <h1 className="rsv-h1">Reservations</h1>
          <div className="rsv-muted">
            Manage reservations (list / create / delete)
          </div>
        </div>

        <div className="rsv-head-actions">
          <button
            className="rsv-btn rsv-primary"
            onClick={() => setOpenCreate(true)}
          >
            + New reservation
          </button>
          <button className="rsv-btn" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="rsv-filters">
        <div className="rsv-field">
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
          >
            {STATUSES.map((s) => (
              <option key={s || 'ALL'} value={s}>
                {s || 'ALL'}
              </option>
            ))}
          </select>
        </div>

        <div className="rsv-field">
          <label>User ID</label>
          <input
            value={userId}
            onChange={(e) => {
              setPage(1)
              setUserId(e.target.value)
            }}
            placeholder="e.g. 13"
          />
        </div>

        <div className="rsv-pagination">
          <button
            className="rsv-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <div className="rsv-page-indicator">
            Page <b>{page}</b> / {totalPages}
          </div>
          <button
            className="rsv-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="rsv-alert">
          <div className="rsv-alert-title">Error</div>
          <div className="rsv-alert-msg">{error}</div>
        </div>
      )}

      <div className="rsv-card">
        <div className="rsv-table-wrap">
          <table className="rsv-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Time</th>
                <th>Guests</th>
                <th>Status</th>
                <th>Tables</th>
                <th>Services</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="rsv-td-muted">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rsv-td-muted">
                    No data
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const tables =
                    r.reservation_tables?.map(
                      (x) => x.restaurant_tables?.table_name || x.table_id,
                    ) ?? []
                  const services =
                    r.reservation_services?.map(
                      (x) => x.services?.name || x.service_id,
                    ) ?? []

                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <div className="rsv-cell">
                          <div className="rsv-strong">
                            {r.users?.full_name || `User #${r.user_id}`}
                          </div>
                          <div className="rsv-muted-sm">
                            {r.users?.email || ''}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rsv-cell">
                          <div className="rsv-strong">
                            {new Date(r.reservation_time).toLocaleString()}
                          </div>
                          <div className="rsv-muted-sm">
                            End:{' '}
                            {new Date(r.reservation_endtime).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td>{r.number_of_guests}</td>
                      <td>
                        <span className={`rsv-badge rsv-badge-${r.status}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="rsv-muted-sm">
                        {tables.join(', ') || '—'}
                      </td>
                      <td className="rsv-muted-sm">
                        {services.join(', ') || '—'}
                      </td>
                      <td>
                        <div className="rsv-actions-row">
                          <Link
                            className="rsv-btn"
                            href={`/admin/reservations/${r.id}`}
                          >
                            Detail
                          </Link>
                          <button
                            className="rsv-btn rsv-danger"
                            onClick={() => handleDelete(r.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openCreate && (
        <div
          className="rsv-modal-overlay"
          onMouseDown={() => setOpenCreate(false)}
        >
          <div className="rsv-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="rsv-modal-head">
              <div>
                <div className="rsv-modal-title">Create reservation</div>
                <div className="rsv-muted-sm">
                  Fill required fields then Create
                </div>
              </div>
              <button className="rsv-btn" onClick={() => setOpenCreate(false)}>
                Close
              </button>
            </div>

            <ReservationForm
              mode="create"
              submitting={creating}
              onSubmit={handleCreate}
            />
          </div>
        </div>
      )}
    </div>
  )
}
