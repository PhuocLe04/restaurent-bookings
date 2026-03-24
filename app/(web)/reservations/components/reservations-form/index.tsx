'use client'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import type { TableType } from '../index'
import { flip, offset, shift } from '@floating-ui/dom'
import '@/app/(web)/reservations/page.css'

type Session = 'morning' | 'afternoon'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function parseLocalDateTime(value: string) {
  if (!value) return null
  const [datePart, timePart = '07:30'] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

function toLocalDateTimeString(date: Date) {
  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      '-',
    ) + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

function getSession(date: Date | null): Session {
  if (!date) return 'morning'
  return date.getHours() < 12 ? 'morning' : 'afternoon'
}

function setDateTime(date: Date, hour: number, minute: number) {
  const next = new Date(date)
  next.setHours(hour, minute, 0, 0)
  return next
}

function roundUpToNext30Minutes(date: Date) {
  const next = new Date(date)
  next.setSeconds(0, 0)

  const minutes = next.getMinutes()
  const remainder = minutes % 30

  if (remainder !== 0) {
    next.setMinutes(minutes + (30 - remainder))
  }

  return next
}

function clampToBusinessHours(date: Date) {
  const next = new Date(date)
  const minutesOfDay = next.getHours() * 60 + next.getMinutes()
  const open = 7 * 60 + 30
  const close = 20 * 60 + 30

  if (minutesOfDay < open) return setDateTime(next, 7, 30)
  if (minutesOfDay > close) return setDateTime(next, 20, 30)
  return next
}

function buildTimeOptions() {
  const options: Date[] = []
  const base = new Date(2000, 0, 1, 7, 30, 0, 0)
  const end = new Date(2000, 0, 1, 20, 30, 0, 0)

  while (base <= end) {
    options.push(new Date(base))
    base.setMinutes(base.getMinutes() + 30)
  }

  return options
}

const TIME_OPTIONS = buildTimeOptions()

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

  const selectedDate =
    parseLocalDateTime(timeLocal) ??
    clampToBusinessHours(roundUpToNext30Minutes(new Date()))

  const minDateTime =
    parseLocalDateTime(minTimeLocal) ??
    clampToBusinessHours(roundUpToNext30Minutes(new Date()))

  const currentSession = getSession(selectedDate)

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

  function updateSelectedDate(next: Date | null) {
    if (!next) return

    let finalDate = new Date(next)
    finalDate = roundUpToNext30Minutes(finalDate)
    finalDate = clampToBusinessHours(finalDate)

    if (finalDate < minDateTime) {
      finalDate = new Date(minDateTime)
    }

    setTimeLocal(toLocalDateTimeString(finalDate))
  }

  function handleSessionChange(session: Session) {
    const base = new Date(selectedDate)
    let next = new Date(base)

    if (session === 'morning') {
      const isAfternoon = base.getHours() >= 12
      next = isAfternoon ? setDateTime(base, 7, 30) : base

      if (
        next.getHours() < 7 ||
        (next.getHours() === 7 && next.getMinutes() < 30)
      ) {
        next = setDateTime(next, 7, 30)
      }
      if (
        next.getHours() > 11 ||
        (next.getHours() === 11 && next.getMinutes() > 30)
      ) {
        next = setDateTime(next, 11, 30)
      }
    } else {
      const isMorning = base.getHours() < 12
      next = isMorning ? setDateTime(base, 12, 0) : base

      if (next.getHours() < 12) {
        next = setDateTime(next, 12, 0)
      }
      if (
        next.getHours() > 20 ||
        (next.getHours() === 20 && next.getMinutes() > 30)
      ) {
        next = setDateTime(next, 20, 30)
      }
    }

    if (next < minDateTime) {
      next = new Date(minDateTime)
    }

    setTimeLocal(toLocalDateTimeString(next))
  }

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    )
  }

  function filterTime(time: Date) {
    const hour = time.getHours()
    const minute = time.getMinutes()
    const total = hour * 60 + minute

    const open = 7 * 60 + 30
    const morningEnd = 11 * 60 + 30
    const afternoonStart = 12 * 60
    const close = 20 * 60 + 30

    const inMorning = total >= open && total <= morningEnd
    const inAfternoon = total >= afternoonStart && total <= close

    const sessionOk = currentSession === 'morning' ? inMorning : inAfternoon

    if (!sessionOk) return false

    const selected = selectedDate
    const min = minDateTime

    if (isSameDay(selected, min)) {
      const minTotal = min.getHours() * 60 + min.getMinutes()
      if (total < minTotal) return false
    }

    return true
  }

  function renderTimeContent() {
    const morning = TIME_OPTIONS.filter((t) => {
      const mins = t.getHours() * 60 + t.getMinutes()
      return mins >= 7 * 60 + 30 && mins <= 11 * 60 + 30
    })

    const afternoon = TIME_OPTIONS.filter((t) => {
      const mins = t.getHours() * 60 + t.getMinutes()
      return mins >= 12 * 60 && mins <= 20 * 60 + 30
    })

    const selectedValue = `${pad(selectedDate.getHours())}:${pad(
      selectedDate.getMinutes(),
    )}`

    return (
      <div className="reservation-datepicker__time-panel">
        <div className="reservation-datepicker__session-tabs">
          <button
            type="button"
            className={`reservation-datepicker__session-btn ${
              currentSession === 'morning' ? 'is-active' : ''
            }`}
            onClick={() => handleSessionChange('morning')}
          >
            <span className="reservation-datepicker__session-title">Sáng</span>
            <span className="reservation-datepicker__session-sub">
              07:30 - 11:30
            </span>
          </button>

          <button
            type="button"
            className={`reservation-datepicker__session-btn ${
              currentSession === 'afternoon' ? 'is-active' : ''
            }`}
            onClick={() => handleSessionChange('afternoon')}
          >
            <span className="reservation-datepicker__session-title">Chiều</span>
            <span className="reservation-datepicker__session-sub">
              12:00 - 20:30
            </span>
          </button>
        </div>

        <div className="reservation-datepicker__time-list-wrap">
          <div className="reservation-datepicker__time-group">
            <div className="reservation-datepicker__time-group-label">Sáng</div>
            <div className="reservation-datepicker__chips">
              {morning.map((item) => {
                const value = `${pad(item.getHours())}:${pad(item.getMinutes())}`
                const disabled = !filterTime(item)
                const active = selectedValue === value

                return (
                  <button
                    key={`morning-${value}`}
                    type="button"
                    disabled={disabled}
                    className={`reservation-datepicker__chip ${
                      active ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      const next = setDateTime(
                        selectedDate,
                        item.getHours(),
                        item.getMinutes(),
                      )
                      updateSelectedDate(next)
                    }}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="reservation-datepicker__time-group">
            <div className="reservation-datepicker__time-group-label">
              Chiều
            </div>
            <div className="reservation-datepicker__chips">
              {afternoon.map((item) => {
                const value = `${pad(item.getHours())}:${pad(item.getMinutes())}`
                const disabled = !filterTime(item)
                const active = selectedValue === value

                return (
                  <button
                    key={`afternoon-${value}`}
                    type="button"
                    disabled={disabled}
                    className={`reservation-datepicker__chip ${
                      active ? 'is-active' : ''
                    }`}
                    onClick={() => {
                      const next = setDateTime(
                        selectedDate,
                        item.getHours(),
                        item.getMinutes(),
                      )
                      updateSelectedDate(next)
                    }}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
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

          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => updateSelectedDate(date)}
            minDate={minDateTime}
            customInput={
              <input
                className="reservation-field__input reservation-field__input--datepicker"
                readOnly
              />
            }
            dateFormat="dd/MM/yyyy - HH:mm"
            calendarClassName="reservation-datepicker__calendar"
            popperClassName="reservation-datepicker__popper"
            popperPlacement="bottom-start"
            popperProps={{
              strategy: 'fixed',
            }}
            popperModifiers={[
              flip({
                fallbackPlacements: [],
                crossAxis: false,
              }),
              shift({ padding: 8 }),
            ]}
            renderCustomHeader={({
              date,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }) => (
              <div className="reservation-datepicker__header">
                <button
                  type="button"
                  className="reservation-datepicker__nav"
                  onClick={decreaseMonth}
                  disabled={prevMonthButtonDisabled}
                  aria-label="Tháng trước"
                >
                  ‹
                </button>

                <div className="reservation-datepicker__header-title">
                  {date.toLocaleDateString('vi-VN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>

                <button
                  type="button"
                  className="reservation-datepicker__nav"
                  onClick={increaseMonth}
                  disabled={nextMonthButtonDisabled}
                  aria-label="Tháng sau"
                >
                  ›
                </button>
              </div>
            )}
          >
            {renderTimeContent()}
          </DatePicker>

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
              Hệ thống sẽ tự động chọn đúng số bàn theo yêu cầu.
            </p>
          )}
        </div>

        <div className="reservation-field">
          <label className="reservation-field__label">Loại bàn</label>

          <div className="reservation-select-wrap">
            <select
              className="reservation-field__input reservation-field__select"
              value={tableTypeId}
              onChange={(e) => setTableTypeId(e.target.value)}
            >
              {tableTypes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <span className="reservation-select-wrap__icon" aria-hidden="true">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          {chosenType && (
            <div className="reservation-type-card reservation-type-card--highlight">
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
