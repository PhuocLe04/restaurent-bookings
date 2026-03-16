'use client'

import type { TableType } from '../index'
import '@/app/(web)/reservations/page.css'

export default function ReservationForm(props: {
  guests: number
  setGuests: (v: number) => void
  tableCount: number
  setTableCount: (v: number) => void
  tableTypes: TableType[]
  tableTypeId: string
  setTableTypeId: (v: string) => void
  chosenType: TableType | null
  timeLocal: string
  setTimeLocal: (v: string) => void
  minTimeLocal: string
}) {
  const {
    guests,
    setGuests,
    tableCount,
    setTableCount,
    tableTypes,
    tableTypeId,
    setTableTypeId,
    chosenType,
    timeLocal,
    setTimeLocal,
    minTimeLocal,
  } = props

  function onGuestsChange(value: string) {
    if (value === '') return setGuests(0)
    const n = Number(value)
    setGuests(Number.isFinite(n) ? Math.max(0, n) : 0)
  }

  function onTablesChange(value: string) {
    if (value === '') return setTableCount(0)
    const n = Number(value)
    setTableCount(Number.isFinite(n) ? Math.max(0, n) : 0)
  }

  return (
    <div className="reservation-form">
      <div className="reservation-form__head">
        <div>
          <h3 className="reservation-form__title">Thông tin cơ bản</h3>
          <p className="reservation-form__subtitle">
            Chọn thời gian, số lượng khách và loại bàn phù hợp.
          </p>
        </div>
      </div>

      <div className="reservation-form__grid">
        <div className="reservation-field">
          <label className="reservation-field__label">Thời gian đặt bàn</label>
          <input
            type="datetime-local"
            className="reservation-field__input"
            value={timeLocal}
            min={minTimeLocal}
            onChange={(e) => setTimeLocal(e.target.value)}
          />
          <p className="reservation-field__hint">
            Khung giờ nhận đặt bàn từ <b>07:30</b> đến <b>20:30</b>.
          </p>
        </div>

        <div className="reservation-field">
          <label className="reservation-field__label">Số lượng khách</label>

          <div className="reservation-counter">
            <button
              type="button"
              className="reservation-counter__btn"
              onClick={() => setGuests(Math.max(1, guests - 1))}
            >
              −
            </button>

            <input
              type="number"
              min={1}
              className="reservation-counter__input"
              value={guests}
              onChange={(e) => onGuestsChange(e.target.value)}
            />

            <button
              type="button"
              className="reservation-counter__btn"
              onClick={() => setGuests(guests + 1)}
            >
              +
            </button>
          </div>

          <p className="reservation-field__hint">
            Nhập tổng số khách tham dự bữa ăn.
          </p>
        </div>

        <div className="reservation-field">
          <label className="reservation-field__label">Số lượng bàn</label>

          <div className="reservation-counter">
            <button
              type="button"
              className="reservation-counter__btn"
              onClick={() => setTableCount(Math.max(1, tableCount - 1))}
            >
              −
            </button>

            <input
              type="number"
              min={1}
              className="reservation-counter__input"
              value={tableCount}
              onChange={(e) => onTablesChange(e.target.value)}
            />

            <button
              type="button"
              className="reservation-counter__btn"
              onClick={() => setTableCount(tableCount + 1)}
            >
              +
            </button>
          </div>

          {tableCount > guests ? (
            <p className="reservation-field__error">
              Số lượng bàn không được lớn hơn số khách.
            </p>
          ) : (
            <p className="reservation-field__hint">
              Hệ thống sẽ tự động chọn bàn phù hợp theo yêu cầu.
            </p>
          )}
        </div>

        <div className="reservation-field">
          <label className="reservation-field__label">Loại bàn</label>
          <select
            className="reservation-field__input"
            value={tableTypeId}
            onChange={(e) => setTableTypeId(e.target.value)}
          >
            {tableTypes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>

          {chosenType && (
            <div className="reservation-type-card">
              <div className="reservation-type-card__label">
                Loại bàn đã chọn
              </div>
              <div className="reservation-type-card__name">
                {chosenType.name}
              </div>
              {chosenType.description && (
                <div className="reservation-type-card__desc">
                  {chosenType.description}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
