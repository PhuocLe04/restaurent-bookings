'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ReservationForm, type ReservationFormValue } from '../components'

type ReservationDetail = {
  id: number
  user_id: number
  reservation_time: string
  reservation_endtime: string
  number_of_guests: number
  status: string
  checked_in_at: string | null
  completed_at: string | null
  users?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
  reservation_tables?: Array<{ table_id: number }>
  reservation_services?: Array<{
    service_id: number
    quantity: number
    unit_price: any
  }>
  orders?: any[]
  payments?: any[]
}

type DetailResponse = { data: ReservationDetail }

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => Number(params.id), [params.id])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ReservationDetail | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setError('')
      setLoading(true)
      const res = await fetch(`/admin/api/reservation/${id}`, {
        cache: 'no-store',
      })
      const j = await res.json().catch(() => null)
      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`)
      setData((j as DetailResponse).data)
    } catch (e: any) {
      setError(String(e?.message ?? e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleUpdate = async (value: ReservationFormValue) => {
    try {
      setSaving(true)
      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      })
      const j = await res.json().catch(() => null)
      if (!res.ok)
        throw new Error(j?.message || `Update failed (HTTP ${res.status})`)
      await load()
      alert('Updated!')
    } catch (e: any) {
      alert(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const ok = confirm(`Delete reservation #${id}?`)
    if (!ok) return
    try {
      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => null)
      if (!res.ok)
        throw new Error(j?.message || `Delete failed (HTTP ${res.status})`)
      router.push('/admin/reservations')
      router.refresh()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
  }

  const initial: Partial<ReservationFormValue> | undefined = useMemo(() => {
    if (!data) return undefined
    return {
      user_id: data.user_id,
      reservation_time: data.reservation_time
        ? new Date(data.reservation_time).toISOString().slice(0, 16)
        : '',
      number_of_guests: data.number_of_guests,
      status: data.status,
      table_ids: data.reservation_tables?.map((x) => x.table_id) ?? [],
      services:
        data.reservation_services?.map((s) => ({
          service_id: s.service_id,
          quantity: s.quantity,
          unit_price: s.unit_price != null ? Number(s.unit_price) : undefined,
        })) ?? [],
    }
  }, [data])

  return (
    <div className="rsv-page">
      <div className="rsv-head">
        <div>
          <h1 className="rsv-h1">Reservation #{id}</h1>
          <div className="rsv-muted">
            {loading
              ? 'Loading…'
              : data?.users?.full_name || `User #${data?.user_id ?? ''}`}
          </div>
        </div>

        <div className="rsv-head-actions">
          <Link className="rsv-btn" href="/admin/reservations">
            ← Back
          </Link>
          <button className="rsv-btn rsv-danger" onClick={handleDelete}>
            Delete
          </button>
          <button className="rsv-btn" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="rsv-alert">Error: {error}</div>}

      <div className="rsv-card">
        {loading ? (
          <div className="rsv-td-muted">Loading…</div>
        ) : !data ? (
          <div className="rsv-td-muted">Not found</div>
        ) : (
          <>
            <div className="rsv-sum">
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Status</div>
                <div className="rsv-strong">{data.status}</div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Guests</div>
                <div className="rsv-strong">{data.number_of_guests}</div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Checked in</div>
                <div className="rsv-strong">
                  {data.checked_in_at ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Completed</div>
                <div className="rsv-strong">
                  {data.completed_at ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Orders</div>
                <div className="rsv-strong">{data.orders?.length ?? 0}</div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Payments</div>
                <div className="rsv-strong">{data.payments?.length ?? 0}</div>
              </div>
            </div>

            <div className="rsv-divider" />

            <ReservationForm
              mode="edit"
              initial={initial}
              submitting={saving}
              onSubmit={handleUpdate}
            />
          </>
        )}
      </div>
    </div>
  )
}
