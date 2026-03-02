'use client'

import { useEffect, useMemo, useState } from 'react'

type ServiceInput = {
  service_id: number
  service_name?: string // ✅ để hiển thị
  quantity: number
  unit_price?: number
}

export type ReservationFormValue = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  status: string
  table_ids: number[]
  services: Array<{
    service_id: number
    quantity: number
    unit_price?: number
  }>
}

type Props = {
  mode: 'create' | 'edit'
  initial?: Partial<{
    user_id: number
    reservation_time: string
    number_of_guests: number
    status: string
    table_ids: number[]
    services: ServiceInput[]
  }>
  onSubmit: (value: ReservationFormValue) => Promise<void> | void
  submitting?: boolean
}

const DEFAULT_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']

function nowLocalDatetimeInputValue() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

function parseIds(text: string): number[] {
  return text
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function safeNumber(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function ReservationForm({
  mode,
  initial,
  onSubmit,
  submitting,
}: Props) {
  const init = useMemo(() => {
    return {
      user_id: safeNumber(initial?.user_id, 0),
      reservation_time: String(
        initial?.reservation_time ?? nowLocalDatetimeInputValue(),
      ),
      number_of_guests: safeNumber(initial?.number_of_guests, 1),
      status: String(initial?.status ?? 'PENDING'),
      table_ids: Array.isArray(initial?.table_ids) ? initial!.table_ids! : [],
      services: Array.isArray(initial?.services) ? initial!.services! : [],
    }
  }, [initial])

  const [userId, setUserId] = useState(init.user_id)
  const [reservationTime, setReservationTime] = useState(init.reservation_time)
  const [guests, setGuests] = useState(init.number_of_guests)
  const [status, setStatus] = useState(init.status)
  const [tableIdsText, setTableIdsText] = useState(init.table_ids.join(', '))
  const [services, setServices] = useState<ServiceInput[]>(init.services)

  useEffect(() => {
    // reset when initial changes
    setUserId(init.user_id)
    setReservationTime(init.reservation_time)
    setGuests(init.number_of_guests)
    setStatus(init.status)
    setTableIdsText(init.table_ids.join(', '))
    setServices(init.services)
  }, [init])

  const addService = () => {
    // ✅ nếu bạn chưa làm chọn service, row mới sẽ chưa có name/id
    // bạn có thể đổi logic này sau khi làm dropdown
    setServices((prev) => [
      ...prev,
      { service_id: 0, service_name: 'Select service', quantity: 1 },
    ])
  }

  const removeService = (idx: number) => {
    setServices((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateService = (idx: number, patch: Partial<ServiceInput>) => {
    setServices((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const value: ReservationFormValue = {
      user_id: safeNumber(userId),
      reservation_time: reservationTime,
      number_of_guests: safeNumber(guests),
      status: String(status).trim(),
      table_ids: parseIds(tableIdsText),

      // ✅ vẫn gửi service_id
      services: services
        .map((s) => ({
          service_id: safeNumber(s.service_id),
          quantity: safeNumber(s.quantity ?? 1),
          unit_price:
            s.unit_price === undefined ||
            s.unit_price === null ||
            s.unit_price === ('' as any)
              ? undefined
              : safeNumber(s.unit_price),
        }))
        .filter((s) => Number.isFinite(s.service_id) && s.service_id > 0),
    }

    await onSubmit(value)
  }

  return (
    <form className="rsv-form" onSubmit={handleSubmit}>
      <div className="rsv-grid">
        <div className="rsv-field">
          <label>User ID</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
            min={1}
            required
          />
        </div>

        <div className="rsv-field">
          <label>Reservation time</label>
          <input
            type="datetime-local"
            value={reservationTime}
            onChange={(e) => setReservationTime(e.target.value)}
            required
          />
        </div>

        <div className="rsv-field">
          <label>Guests</label>
          <input
            type="number"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            min={1}
            required
          />
        </div>

        <div className="rsv-field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {DEFAULT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rsv-field rsv-span-2">
          <label>Table IDs (comma separated)</label>
          <input
            value={tableIdsText}
            onChange={(e) => setTableIdsText(e.target.value)}
            placeholder="e.g. 1, 2, 3"
          />
        </div>
      </div>

      {/* ✅ SERVICES: NAME + TOTAL = unit_price * quantity */}
      <div className="rsv-services">
        <div className="rsv-services-head">
          <div>
            <div className="rsv-title">Services</div>
            <div className="rsv-sub">
              service name, quantity, unit_price, total
            </div>
          </div>
          <button type="button" className="rsv-btn" onClick={addService}>
            + Add service
          </button>
        </div>

        {services.length === 0 ? (
          <div className="rsv-empty">No services</div>
        ) : (
          <div className="rsv-services-list">
            {services.map((s, idx) => {
              const qty = safeNumber(s.quantity, 0)
              const unit = safeNumber(s.unit_price, 0)
              const total = qty * unit

              return (
                <div className="rsv-service-row" key={idx}>
                  {/* ✅ Name (hiển thị) */}
                  <input
                    type="text"
                    value={s.service_name ?? `Service #${s.service_id}`}
                    disabled
                  />

                  {/* quantity */}
                  <input
                    type="number"
                    placeholder="quantity"
                    value={s.quantity}
                    onChange={(e) =>
                      updateService(idx, { quantity: Number(e.target.value) })
                    }
                    min={1}
                  />

                  {/* unit_price */}
                  <input
                    type="number"
                    placeholder="unit_price"
                    value={s.unit_price ?? ''}
                    onChange={(e) =>
                      updateService(idx, {
                        unit_price:
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                    min={0}
                  />

                  {/* ✅ Total */}
                  <input
                    type="text"
                    value={
                      Number.isFinite(total) ? total.toLocaleString() : '0'
                    }
                    disabled
                  />

                  <button
                    type="button"
                    className="rsv-btn rsv-danger"
                    onClick={() => removeService(idx)}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rsv-actions">
        <button
          className="rsv-btn rsv-primary"
          disabled={!!submitting}
          type="submit"
        >
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create'
              : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
