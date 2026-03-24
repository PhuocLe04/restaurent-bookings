'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import 'animate.css'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

type CreateBody = {
  code: string
  name: string
  min_point: number
  discount_percent: number
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  loading?: boolean
  key: number
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

export default function MembershipCreatePage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  const [minPointInput, setMinPointInput] = useState('0')
  const [discountPercent, setDiscountPercent] = useState<number>(0)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    loading: false,
    key: 0,
  })

  const showToast = (
    type: MessageType,
    title: string,
    message: string,
    loading = false,
  ) => {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      loading,
      key: prev.key + 1,
    }))
  }

  const closeToast = () => {
    setToast((prev) => ({
      ...prev,
      visible: false,
      loading: false,
    }))
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  function onlyDigits(value: string) {
    return value.replace(/\D/g, '')
  }

  function formatNumberVN(value: string | number) {
    const digits = typeof value === 'number' ? String(value) : onlyDigits(value)
    if (!digits) return ''
    return Number(digits).toLocaleString('vi-VN')
  }

  const minPoint = useMemo(() => {
    const digits = onlyDigits(minPointInput)
    if (!digits) return 0
    const n = Number(digits)
    return Number.isFinite(n) ? n : NaN
  }, [minPointInput])

  const minPointDisplay = useMemo(() => {
    const digits = onlyDigits(minPointInput)
    if (!digits) return ''
    return formatNumberVN(digits)
  }, [minPointInput])

  const discountOk = useMemo(
    () =>
      Number.isFinite(discountPercent) &&
      discountPercent >= 0 &&
      discountPercent <= 100,
    [discountPercent],
  )

  const minPointOk = useMemo(
    () => Number.isFinite(minPoint) && minPoint >= 0,
    [minPoint],
  )

  function decDiscount() {
    setDiscountPercent((v) => clamp((Number.isFinite(v) ? v : 0) - 1, 0, 100))
  }

  function incDiscount() {
    setDiscountPercent((v) => clamp((Number.isFinite(v) ? v : 0) + 1, 0, 100))
  }

  async function onCreate() {
    if (!code.trim()) {
      setError('Mã (code) là bắt buộc.')
      showToast('warning', 'Thiếu thông tin', 'Mã (code) là bắt buộc.')
      return
    }

    if (!name.trim()) {
      setError('Tên hạng là bắt buộc.')
      showToast('warning', 'Thiếu thông tin', 'Tên hạng là bắt buộc.')
      return
    }

    if (!minPointOk) {
      setError('Điểm tối thiểu không hợp lệ.')
      showToast(
        'warning',
        'Dữ liệu không hợp lệ',
        'Điểm tối thiểu không hợp lệ.',
      )
      return
    }

    if (!discountOk) {
      setError('Giảm giá (%) phải trong khoảng 0–100.')
      showToast(
        'warning',
        'Dữ liệu không hợp lệ',
        'Giảm giá (%) phải trong khoảng 0–100.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast('info', 'Đang tạo', 'Đang tạo hạng thành viên...', true)

      const body: CreateBody = {
        code: code.trim(),
        name: name.trim(),
        min_point: Number(minPoint),
        discount_percent: Number(discountPercent),
      }

      const res = await fetch('/admin/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Tạo hạng thành viên thất bại')
      }

      showToast(
        'success',
        'Tạo thành công',
        `Đã tạo hạng thành viên "${name.trim()}".`,
      )

      setTimeout(() => {
        router.push('/admin/membership')
        router.refresh()
      }, 900)
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      setError(msg)
      showToast('error', 'Tạo thất bại', msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      className="member-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="member-head animate__animated animate__fadeInDown"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1 className="admin-title">Tạo hạng thành viên</h1>
        </div>

        <div className="member-head-actions">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link className="member-btn" href="/admin/membership">
              ← Quay lại
            </Link>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            className="member-alert animate__animated animate__shakeX"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            Lỗi: {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="member-card animate__animated animate__fadeInUp"
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.4 }}
      >
        <motion.form
          className="member-form"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          onSubmit={(e) => {
            e.preventDefault()
            onCreate()
          }}
        >
          <div className="member-form-grid">
            <motion.div
              className="member-form-field"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.14, duration: 0.25 }}
            >
              <label>Mã hạng (code)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="vd: default, gold, vip..."
                required
              />
            </motion.div>

            <motion.div
              className="member-form-field"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.25 }}
            >
              <label>Tên hạng</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd: Hạng Bạc, Hạng Vàng..."
                required
              />
            </motion.div>

            <motion.div
              className="member-form-field"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22, duration: 0.25 }}
            >
              <label>Điểm tối thiểu</label>
              <input
                type="text"
                inputMode="numeric"
                value={minPointDisplay}
                onFocus={() => {
                  if (onlyDigits(minPointInput) === '0') setMinPointInput('')
                }}
                onChange={(e) => {
                  const raw = onlyDigits(e.target.value)
                  setMinPointInput(raw)
                }}
                onBlur={() => {
                  const raw = onlyDigits(minPointInput)
                  setMinPointInput(raw === '' ? '0' : String(Number(raw)))
                }}
                placeholder="Nhập điểm tối thiểu..."
              />
              {!minPointOk && (
                <div
                  className="member-muted-sm animate__animated animate__fadeIn"
                  style={{
                    color: 'rgba(255, 120, 120, 0.9)',
                    marginTop: 6,
                  }}
                >
                  Điểm tối thiểu phải ≥ 0.
                </div>
              )}
            </motion.div>

            <motion.div
              className="member-form-field"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.26, duration: 0.25 }}
            >
              <label>Giảm giá (%)</label>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <motion.button
                  type="button"
                  className="member-btn"
                  onClick={decDiscount}
                  disabled={saving || discountPercent <= 0}
                  aria-label="Giảm 1%"
                  title="Giảm 1%"
                  whileHover={saving || discountPercent <= 0 ? {} : { y: -1 }}
                  whileTap={
                    saving || discountPercent <= 0 ? {} : { scale: 0.97 }
                  }
                >
                  −
                </motion.button>

                <input
                  type="text"
                  inputMode="numeric"
                  value={String(discountPercent)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '')
                    const n = raw === '' ? 0 : Number(raw)
                    setDiscountPercent(clamp(Math.floor(n), 0, 100))
                  }}
                  onBlur={() => {
                    setDiscountPercent((v) =>
                      clamp(Math.floor(Number(v) || 0), 0, 100),
                    )
                  }}
                  style={{ flex: 1 }}
                />

                <motion.button
                  type="button"
                  className="member-btn"
                  onClick={incDiscount}
                  disabled={saving || discountPercent >= 100}
                  aria-label="Tăng 1%"
                  title="Tăng 1%"
                  whileHover={saving || discountPercent >= 100 ? {} : { y: -1 }}
                  whileTap={
                    saving || discountPercent >= 100 ? {} : { scale: 0.97 }
                  }
                >
                  +
                </motion.button>
              </div>

              {!discountOk && (
                <div
                  className="member-muted-sm animate__animated animate__fadeIn"
                  style={{
                    color: 'rgba(255, 120, 120, 0.9)',
                    marginTop: 6,
                  }}
                >
                  % giảm giá phải trong khoảng 0–100.
                </div>
              )}
            </motion.div>
          </div>

          <div className="member-form-actions">
            <motion.button
              className="member-btn member-primary"
              type="submit"
              disabled={saving}
              whileHover={saving ? {} : { y: -2, scale: 1.01 }}
              whileTap={saving ? {} : { scale: 0.98 }}
            >
              {saving ? 'Đang tạo...' : 'Tạo hạng'}
            </motion.button>
          </div>
        </motion.form>
      </motion.div>

      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        autoClose={toast.loading ? 0 : 3500}
        position="top-right"
        toastKey={toast.key}
        loading={toast.loading}
        showIcon
        showCloseButton
        bubbleEffect
        glowEffect
        glassIntensity="medium"
      />
    </motion.div>
  )
}
