'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

type ReservationUpdateValue = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  status: string
  table_ids: number[]
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SEATED', label: 'Đã đến' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'NO_SHOW', label: 'Không đến' },
]

function getStatusLabel(status: string) {
  switch (String(status).toUpperCase()) {
    case 'PENDING':
      return 'Chờ xác nhận'
    case 'CONFIRMED':
      return 'Đã xác nhận'
    case 'SEATED':
      return 'Đã đến'
    case 'COMPLETED':
      return 'Hoàn thành'
    case 'CANCELLED':
      return 'Đã hủy'
    case 'NO_SHOW':
      return 'Không đến'
    default:
      return status || 'Không rõ'
  }
}

function parseIds(text: string): number[] {
  return text
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => Number(params.id), [params.id])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ReservationDetail | null>(null)
  const [error, setError] = useState('')

  const [userId, setUserId] = useState(0)
  const [reservationTime, setReservationTime] = useState('')
  const [guests, setGuests] = useState(1)
  const [status, setStatus] = useState('PENDING')
  const [tableIdsText, setTableIdsText] = useState('')

  const load = async () => {
    try {
      setError('')
      setLoading(true)

      const res = await fetch(`/admin/api/reservation/${id}`, {
        cache: 'no-store',
      })
      const j = await res.json().catch(() => null)

      if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`)

      const detail = (j as DetailResponse).data
      setData(detail)

      setUserId(detail.user_id)
      setReservationTime(toDatetimeLocal(detail.reservation_time))
      setGuests(detail.number_of_guests)
      setStatus(detail.status)
      setTableIdsText(
        detail.reservation_tables?.map((x) => x.table_id).join(', ') ?? '',
      )
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: ReservationUpdateValue = {
      user_id: Number(userId),
      reservation_time: reservationTime,
      number_of_guests: Number(guests),
      status,
      table_ids: parseIds(tableIdsText),
    }

    try {
      setSaving(true)

      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const j = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(j?.message || `Cập nhật thất bại (HTTP ${res.status})`)
      }

      await load()
      alert('Cập nhật thành công!')
    } catch (e: any) {
      alert(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const ok = confirm(`Bạn có chắc muốn xóa đặt bàn #${id} không?`)
    if (!ok) return

    try {
      const res = await fetch(`/admin/api/reservation/${id}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(j?.message || `Xóa thất bại (HTTP ${res.status})`)
      }

      router.push('/admin/reservations')
      router.refresh()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
  }

  return (
    <div className="rsv-page">
      <div className="rsv-head">
        <div>
          <h1 className="rsv-h1">Đặt bàn #{id}</h1>
          <div className="rsv-muted">
            {loading
              ? 'Đang tải...'
              : data?.users?.full_name || `Người dùng #${data?.user_id ?? ''}`}
          </div>
        </div>

        <div className="rsv-head-actions">
          <Link className="rsv-btn" href="/admin/reservations">
            ← Quay lại
          </Link>
          <button className="rsv-btn rsv-danger" onClick={handleDelete}>
            Xóa
          </button>
          <button className="rsv-btn" onClick={load}>
            Làm mới
          </button>
        </div>
      </div>

      {error && <div className="rsv-alert">Lỗi: {error}</div>}

      <div className="rsv-card">
        {loading ? (
          <div className="rsv-td-muted">Đang tải...</div>
        ) : !data ? (
          <div className="rsv-td-muted">Không tìm thấy dữ liệu</div>
        ) : (
          <>
            <div className="rsv-sum">
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Trạng thái</div>
                <div className="rsv-strong">{getStatusLabel(data.status)}</div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Số khách</div>
                <div className="rsv-strong">{data.number_of_guests}</div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Đã đến</div>
                <div className="rsv-strong">
                  {data.checked_in_at ? 'Có' : 'Chưa'}
                </div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Hoàn thành</div>
                <div className="rsv-strong">
                  {data.completed_at ? 'Có' : 'Chưa'}
                </div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Đơn hàng</div>
                <div className="rsv-strong">{data.orders?.length ?? 0}</div>
              </div>
              <div className="rsv-sum-item">
                <div className="rsv-muted-sm">Thanh toán</div>
                <div className="rsv-strong">{data.payments?.length ?? 0}</div>
              </div>
            </div>

            <div className="rsv-divider" />

            <form className="rsv-form" onSubmit={handleUpdate}>
              <div className="rsv-grid">
                <div className="rsv-field">
                  <label>ID người dùng</label>
                  <input
                    type="number"
                    value={userId}
                    onChange={(e) => setUserId(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="rsv-field">
                  <label>Thời gian đặt bàn</label>
                  <input
                    type="datetime-local"
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    required
                  />
                </div>

                <div className="rsv-field">
                  <label>Số lượng khách</label>
                  <input
                    type="number"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="rsv-field">
                  <label>Trạng thái</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rsv-field rsv-span-2">
                  <label>ID bàn (ngăn cách bằng dấu phẩy)</label>
                  <input
                    value={tableIdsText}
                    onChange={(e) => setTableIdsText(e.target.value)}
                    placeholder="Ví dụ: 1, 2, 3"
                  />
                </div>
              </div>

              <div className="rsv-actions">
                <button
                  className="rsv-btn rsv-primary"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
