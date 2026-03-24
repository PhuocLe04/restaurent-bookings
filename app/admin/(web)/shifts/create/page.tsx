'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import './page.css'

type StaffOption = {
  id: number
  full_name: string
  is_active: boolean | null
}

type MeResponse = {
  access?: {
    userId: number
    isAdmin: boolean
    isStaff: boolean
  }
  user?: {
    id: number
    full_name: string
    email: string
    phone: string
    role: string
  } | null
  staff?: {
    id: number
    full_name: string
    is_active: boolean | null
  } | null
  message?: string
}

type StaffListResponse = {
  items?: StaffOption[]
  message?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  loading?: boolean
  key: number
}

const OPEN_HOUR = 7
const OPEN_MINUTE = 30
const CLOSE_HOUR = 23
const CLOSE_MINUTE = 30
const MIN_SHIFT_HOURS = 4
const MAX_SHIFT_HOURS = 8
const SLOT_INTERVAL_MINUTES = 30

type TimeSlot = {
  label: string
  value: string
  minutes: number
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function buildTimeSlots() {
  const slots: TimeSlot[] = []
  const start = OPEN_HOUR * 60 + OPEN_MINUTE
  const end = CLOSE_HOUR * 60 + CLOSE_MINUTE

  for (let minutes = start; minutes <= end; minutes += SLOT_INTERVAL_MINUTES) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60

    slots.push({
      label: `${pad(hour)}:${pad(minute)}`,
      value: `${pad(hour)}:${pad(minute)}`,
      minutes,
    })
  }

  return slots
}

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`
}

function buildLocalDateTime(date: Date | null, timeValue: string) {
  if (!date || !timeValue) return ''
  return `${formatDateOnly(date)}T${timeValue}:00`
}

function toHumanDate(date: Date | null) {
  if (!date) return 'Chưa chọn'
  return date.toLocaleDateString('vi-VN')
}

function getDurationHours(startValue: string, endValue: string) {
  if (!startValue || !endValue) return 0
  const [sh, sm] = startValue.split(':').map(Number)
  const [eh, em] = endValue.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em
  return (endMinutes - startMinutes) / 60
}

export default function CreateShiftPage() {
  const router = useRouter()

  const [loadingPage, setLoadingPage] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [access, setAccess] = useState({
    checked: false,
    isAdmin: false,
    isStaff: false,
  })

  const [staffs, setStaffs] = useState<StaffOption[]>([])
  const [staffId, setStaffId] = useState('')
  const [currentStaff, setCurrentStaff] = useState<{
    id: number
    full_name: string
  } | null>(null)

  const [date, setDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState('07:30')
  const [endTime, setEndTime] = useState('11:30')

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    loading: false,
    key: 0,
  })

  function showToast(
    type: MessageType,
    message: string,
    title?: string,
    loading = false,
  ) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      loading,
      key: prev.key + 1,
    }))
  }

  function closeToast() {
    setToast((prev) => ({
      ...prev,
      visible: false,
      loading: false,
    }))
  }

  async function loadBootstrap() {
    try {
      setLoadingPage(true)
      setError('')

      const [meRes, staffRes] = await Promise.all([
        fetch('/admin/api/auth/me', { cache: 'no-store' }),
        fetch('/admin/api/staff?limit=1000', { cache: 'no-store' }),
      ])

      let meJson: MeResponse | null = null
      let staffJson: StaffListResponse | null = null

      try {
        meJson = await meRes.json()
      } catch {
        meJson = null
      }

      try {
        staffJson = await staffRes.json()
      } catch {
        staffJson = null
      }

      if (!meRes.ok) {
        throw new Error(meJson?.message || 'Không thể kiểm tra quyền truy cập')
      }

      const isAdmin = meJson?.access?.isAdmin === true
      const isStaff = meJson?.access?.isStaff === true

      setAccess({
        checked: true,
        isAdmin,
        isStaff,
      })

      if (meJson?.staff) {
        setCurrentStaff({
          id: meJson.staff.id,
          full_name: meJson.staff.full_name,
        })
      } else {
        setCurrentStaff(null)
      }

      const staffItems: StaffOption[] = Array.isArray(staffJson?.items)
        ? staffJson.items
            .map((item: any) => ({
              id: Number(item.id),
              full_name: String(item.full_name || ''),
              is_active: item.is_active ?? true,
            }))
            .filter(
              (item: StaffOption) =>
                Number.isFinite(item.id) &&
                item.id > 0 &&
                item.full_name.trim() &&
                item.is_active !== false,
            )
        : []

      setStaffs(staffItems)

      if (!isAdmin && !isStaff) {
        setError('Bạn không có quyền truy cập trang này')
      }
    } catch (e: any) {
      setError(e?.message || 'Đã xảy ra lỗi')
      setAccess({
        checked: true,
        isAdmin: false,
        isStaff: false,
      })
      setStaffs([])
      setCurrentStaff(null)
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    loadBootstrap()
  }, [])

  const canCreate = access.isAdmin || access.isStaff

  const timeSlots = useMemo(() => buildTimeSlots(), [])

  const selectedStartSlot = useMemo(
    () => timeSlots.find((slot) => slot.value === startTime) || null,
    [timeSlots, startTime],
  )

  const selectedEndSlot = useMemo(
    () => timeSlots.find((slot) => slot.value === endTime) || null,
    [timeSlots, endTime],
  )

  const allowedEndSlots = useMemo(() => {
    if (!selectedStartSlot) return timeSlots

    const minEnd = selectedStartSlot.minutes + MIN_SHIFT_HOURS * 60
    const maxEnd = selectedStartSlot.minutes + MAX_SHIFT_HOURS * 60

    return timeSlots.filter(
      (slot) =>
        slot.minutes > selectedStartSlot.minutes &&
        slot.minutes >= minEnd &&
        slot.minutes <= maxEnd,
    )
  }, [timeSlots, selectedStartSlot])

  useEffect(() => {
    if (!selectedStartSlot) return

    const currentEndValid = allowedEndSlots.some(
      (slot) => slot.value === endTime,
    )

    if (!currentEndValid) {
      const nextValidEnd = allowedEndSlots[0]
      setEndTime(nextValidEnd?.value || '')
    }
  }, [allowedEndSlots, endTime, selectedStartSlot])

  const durationHours = useMemo(
    () => getDurationHours(startTime, endTime),
    [startTime, endTime],
  )

  const startTimeValue = buildLocalDateTime(date, startTime)
  const endTimeValue = buildLocalDateTime(date, endTime)

  function formatDateTimeDisplay(date: Date | null, time: string) {
    if (!date || !time) return 'Chưa chọn'

    const d = date.toLocaleDateString('vi-VN')
    return `${time} - ${d}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!canCreate) {
      showToast(
        'warning',
        'Bạn không có quyền tạo ca làm',
        'Truy cập bị từ chối',
      )
      return
    }

    if (!date) {
      showToast('warning', 'Vui lòng chọn ngày làm việc', 'Thiếu dữ liệu')
      return
    }

    if (access.isAdmin && !staffId) {
      showToast('warning', 'Vui lòng chọn nhân viên', 'Thiếu dữ liệu')
      return
    }

    if (!startTime || !endTime) {
      showToast('warning', 'Vui lòng chọn thời gian hợp lệ', 'Thiếu dữ liệu')
      return
    }

    const duration = getDurationHours(startTime, endTime)

    if (duration < MIN_SHIFT_HOURS) {
      showToast(
        'warning',
        `Ca làm tối thiểu ${MIN_SHIFT_HOURS} tiếng`,
        'Thời lượng không hợp lệ',
      )
      return
    }

    if (duration > MAX_SHIFT_HOURS) {
      showToast(
        'warning',
        `Ca làm tối đa ${MAX_SHIFT_HOURS} tiếng`,
        'Thời lượng không hợp lệ',
      )
      return
    }

    const payload: Record<string, any> = {
      start_time: startTimeValue,
      end_time: endTimeValue,
    }

    if (access.isAdmin) {
      payload.staff_id = Number(staffId)
    }

    try {
      setSubmitting(true)

      const res = await fetch('/admin/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      let json: { message?: string } | null = null
      try {
        json = await res.json()
      } catch {
        json = null
      }

      if (!res.ok) {
        throw new Error(json?.message || 'Tạo ca làm thất bại')
      }

      showToast('success', 'Tạo ca làm thành công', 'Thành công')

      setTimeout(() => {
        router.push('/admin/shifts')
      }, 800)
    } catch (e: any) {
      showToast('error', e?.message || 'Đã xảy ra lỗi', 'Tạo thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      className="shift-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="shift-head">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="admin-title animate__animated animate__fadeInUp">
            Tạo mới ca làm
          </h1>
        </motion.div>

        <motion.div
          className="shift-head-actions"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Link href="/admin/shifts" className="shift-btn shift-btn-secondary">
            ← Quay lại
          </Link>
        </motion.div>
      </div>

      <AnimatePresence>
        {!loadingPage && access.checked && !canCreate && (
          <motion.div
            className="shift-alert animate__animated animate__shakeX"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            ⚠️ Bạn không có quyền truy cập trang này
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            className="shift-alert animate__animated animate__shakeX"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="shift-card"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          delay: 0.3,
          duration: 0.5,
          type: 'spring',
          stiffness: 100,
        }}
      >
        {loadingPage ? (
          <motion.div
            className="shift-td-muted shift-loading-shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Đang tải dữ liệu...
          </motion.div>
        ) : (
          <motion.form
            className="shift-create-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {access.isAdmin && (
              <motion.div
                className="shift-form-group"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <label className="shift-form-label">Nhân viên</label>
                <select
                  className="shift-form-select"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {staffs.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            {access.isStaff && !access.isAdmin && (
              <motion.div
                className="shift-form-group"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <label className="shift-form-label">Nhân viên</label>
                <div className="shift-form-readonly">
                  {currentStaff ? (
                    <strong>{currentStaff.full_name}</strong>
                  ) : (
                    'Đang tải thông tin nhân viên...'
                  )}
                </div>
              </motion.div>
            )}

            <motion.div
              className="shift-form-group"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <label className="shift-form-label">Ngày làm việc</label>
              <div className="shift-datepicker-wrap">
                <DatePicker
                  selected={date}
                  onChange={(value: Date | null) => setDate(value)}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Chọn ngày làm việc"
                  minDate={new Date()}
                  disabled={submitting}
                  className="shift-form-input shift-date-input animate__animated animate__fadeIn"
                  calendarClassName="shift-datepicker-calendar"
                  popperClassName="shift-datepicker-popper"
                  wrapperClassName="shift-datepicker-wrapper"
                  popperPlacement="bottom-start"
                  showPopperArrow={false}
                  shouldCloseOnSelect
                  fixedHeight
                  onKeyDown={(e) => e.preventDefault()}
                  formatWeekDay={(nameOfDay) => nameOfDay.slice(0, 2)}
                />
              </div>
            </motion.div>

            <motion.div
              className="shift-form-group"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <label className="shift-form-label">
                Giờ bắt đầu
                <span className="shift-form-note">Chọn từ 07:30 đến 23:30</span>
              </label>

              <div className="shift-slot-grid">
                {timeSlots.map((slot, index) => (
                  <motion.button
                    key={`start-${slot.value}`}
                    type="button"
                    className={`shift-slot-btn ${
                      startTime === slot.value ? 'is-active' : ''
                    }`}
                    onClick={() => setStartTime(slot.value)}
                    disabled={submitting}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.01, duration: 0.2 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {slot.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="shift-form-group"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              <label className="shift-form-label">
                Giờ kết thúc
                <span className="shift-form-note">
                  Thời gian làm việc từ {MIN_SHIFT_HOURS} đến {MAX_SHIFT_HOURS}{' '}
                  tiếng
                </span>
              </label>

              <div className="shift-slot-grid">
                {timeSlots.map((slot, index) => {
                  const disabled =
                    !allowedEndSlots.some(
                      (allowed) => allowed.value === slot.value,
                    ) || submitting

                  return (
                    <motion.button
                      key={`end-${slot.value}`}
                      type="button"
                      className={`shift-slot-btn ${
                        endTime === slot.value ? 'is-active' : ''
                      } ${disabled ? 'is-disabled' : ''}`}
                      onClick={() => {
                        if (!disabled) setEndTime(slot.value)
                      }}
                      disabled={disabled}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.0 + index * 0.01, duration: 0.2 }}
                      whileHover={!disabled ? { scale: 1.05 } : {}}
                      whileTap={!disabled ? { scale: 0.95 } : {}}
                    >
                      {slot.label}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            <motion.div
              className="shift-form-preview"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="shift-form-preview-title">Xem trước</div>
              <div className="shift-form-preview-text">
                Ngày làm việc: {toHumanDate(date)}
              </div>
              <div className="shift-form-preview-text">
                Bắt đầu: {formatDateTimeDisplay(date, startTime)}
              </div>
              <div className="shift-form-preview-text">
                Kết thúc: {formatDateTimeDisplay(date, endTime)}
              </div>
              <div className="shift-form-preview-text">
                Thời lượng: {durationHours > 0 ? `${durationHours} tiếng` : '—'}
              </div>
            </motion.div>

            <motion.div
              className="shift-form-actions"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              <Link
                href="/admin/shifts"
                className="shift-btn shift-btn-secondary"
              >
                Hủy
              </Link>

              <motion.button
                type="submit"
                className="shift-btn shift-btn-primary"
                disabled={submitting || !canCreate}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={submitting ? { opacity: 0.7 } : { opacity: 1 }}
              >
                {submitting ? 'Đang tạo...' : 'Tạo ca làm'}
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </motion.div>

      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        autoClose={3000}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
        loading={toast.loading}
      />
    </motion.div>
  )
}
