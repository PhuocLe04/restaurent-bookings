'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import 'animate.css'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'

type Membership = {
  id: number
  code: string
  name: string
  min_point: any
  discount_percent: number
  created_at?: string | null
  usersCount?: number
}

type PatchBody = {
  code?: string
  name?: string
  min_point?: number
  discount_percent?: number
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  loading?: boolean
  key: number
}

function fmtDateTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}

export default function MembershipDetailPage() {
  const params = useParams()
  const id = params?.id
  const router = useRouter()

  const [data, setData] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
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

  const isDefault = useMemo(() => Number(id) === 1, [id])

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

  async function fetchDetail() {
    try {
      setError('')
      setLoading(true)

      const res = await fetch(`/admin/api/membership/${id}`, {
        cache: 'no-store',
      })
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Tải hạng thành viên thất bại')
      }

      const m: Membership = json
      setData(m)
      setCode(m.code ?? '')
      setName(m.name ?? '')
      setMinPointInput(String(Number(m.min_point ?? 0)))
      setDiscountPercent(Number(m.discount_percent ?? 0))
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      setError(msg)
      setData(null)
      showToast('error', 'Tải dữ liệu thất bại', msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function decDiscount() {
    setDiscountPercent((v) => clamp((Number.isFinite(v) ? v : 0) - 1, 0, 100))
  }

  function incDiscount() {
    setDiscountPercent((v) => clamp((Number.isFinite(v) ? v : 0) + 1, 0, 100))
  }

  async function onSave() {
    if (!data) return

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
      showToast('info', 'Đang cập nhật', 'Đang lưu thay đổi...', true)

      const body: PatchBody = {
        code: code.trim(),
        name: name.trim(),
        min_point: Number(minPoint),
        discount_percent: Number(discountPercent),
      }

      const res = await fetch(`/admin/api/membership/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Cập nhật thất bại')
      }

      showToast(
        'success',
        'Cập nhật thành công',
        `Đã cập nhật hạng thành viên "${name.trim()}".`,
      )

      await fetchDetail()
      router.refresh()
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      setError(msg)
      showToast('error', 'Cập nhật thất bại', msg)
    } finally {
      setSaving(false)
    }
  }

  function openDeletePopup() {
    if (isDefault) {
      showToast(
        'warning',
        'Không thể xóa',
        'Hạng thành viên mặc định không thể xóa.',
      )
      return
    }

    setDeleteOpen(true)
  }

  async function onDeleteConfirm() {
    try {
      setDeleting(true)
      setError('')
      showToast('info', 'Đang xóa', 'Đang xóa hạng thành viên...', true)

      const res = await fetch(`/admin/api/membership/${id}`, {
        method: 'DELETE',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message ?? 'Xóa thất bại')
      }

      setDeleteOpen(false)
      showToast('success', 'Xóa thành công', 'Đã xóa hạng thành viên.')

      setTimeout(() => {
        router.push('/admin/membership')
        router.refresh()
      }, 900)
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      setError(msg)
      showToast('error', 'Xóa thất bại', msg)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        className="member-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="member-card animate__animated animate__fadeIn"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className="member-td-muted">Đang tải...</div>
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

  if (error || !data) {
    return (
      <motion.div
        className="member-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="member-head animate__animated animate__fadeInDown"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="admin-title">Chi tiết hạng thành viên</h1>
          </div>

          <div className="member-head-actions">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link className="member-btn" href="/admin/membership">
                ← Quay lại
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="member-alert animate__animated animate__fadeIn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              Lỗi: {error}
            </motion.div>
          )}
        </AnimatePresence>

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
          <h1 className="admin-title">Chi tiết hạng thành viên</h1>
        </div>

        <div className="member-head-actions">
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link className="member-btn" href="/admin/membership">
              ← Quay lại
            </Link>
          </motion.div>

          <motion.button
            className="member-btn member-danger"
            onClick={openDeletePopup}
            disabled={isDefault || deleting}
            whileHover={!isDefault && !deleting ? { y: -2, scale: 1.02 } : {}}
            whileTap={!isDefault && !deleting ? { scale: 0.98 } : {}}
          >
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </motion.button>
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
            padding: '16px',
            border: '1px solid var(--admin-border)',
            borderRadius: '16px',
            background: 'rgba(205, 164, 94, 0.05)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(205, 164, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(205, 164, 94, 0.3)',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#cda45e',
              }}
            >
              #{data.id}
            </span>
          </motion.div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '4px',
              }}
            >
              <h2
                className="animate__animated animate__fadeIn"
                style={{
                  margin: 0,
                  fontSize: '20px',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                {data.name}
              </h2>

              {isDefault && (
                <motion.span
                  className="member-badge member-badge-default"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.25 }}
                >
                  Mặc định
                </motion.span>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '13px',
                flexWrap: 'wrap',
              }}
            >
              <span>
                Mã: <strong style={{ color: '#cda45e' }}>{data.code}</strong>
              </span>
              <span className="member-meta-dot" />
              <span>
                Giảm:{' '}
                <strong style={{ color: '#4caf50' }}>
                  {data.discount_percent}%
                </strong>
              </span>
              <span className="member-meta-dot" />
              <span>
                Điểm: <strong>{Number(data.min_point).toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </motion.div>

        <div
          className="member-summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {[
            {
              label: 'Mã hạng',
              value: data.code,
              valueStyle: {
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#cda45e',
                fontFamily: 'monospace',
              } as React.CSSProperties,
            },
            {
              label: 'Giảm giá',
              value: `${Number(data.discount_percent ?? 0)}%`,
              valueStyle: {
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#4caf50',
              } as React.CSSProperties,
            },
            {
              label: 'Điểm tối thiểu',
              value: Number(data.min_point).toLocaleString(),
              valueStyle: {
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#fff',
              } as React.CSSProperties,
            },
            {
              label: 'Số người dùng',
              value: Number(data.usersCount ?? 0).toLocaleString(),
              valueStyle: {
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#fff',
              } as React.CSSProperties,
            },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.06, duration: 0.3 }}
              whileHover={{ y: -4, scale: 1.01 }}
              style={{
                padding: '16px',
                border: '1px solid var(--admin-border)',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div className="member-muted-sm" style={{ marginBottom: '8px' }}>
                {item.label}
              </div>
              <div style={item.valueStyle}>{item.value}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '24px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div>
            <div className="member-muted-sm" style={{ fontSize: '11px' }}>
              NGÀY TẠO
            </div>
            <div style={{ fontSize: '13px', color: '#fff' }}>
              {fmtDateTime(data.created_at)}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="member-divider"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.24, duration: 0.35 }}
          style={{
            height: '1px',
            background: 'var(--admin-border)',
            margin: '20px 0',
            transformOrigin: 'left',
          }}
        />

        <motion.form
          className="member-form"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.35 }}
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <h3
            className="animate__animated animate__fadeIn"
            style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Chỉnh sửa thông tin
          </h3>

          <div className="member-form-grid">
            <motion.div
              className="member-form-field"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.32, duration: 0.25 }}
            >
              <label>Mã hạng (code)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isDefault}
                placeholder="vd: default, gold, vip..."
                required
              />
              {isDefault && (
                <div
                  className="member-muted-sm animate__animated animate__fadeIn"
                  style={{
                    marginTop: 6,
                    color: 'rgba(205, 164, 94, 0.8)',
                  }}
                >
                  Hạng mặc định không thể đổi mã.
                </div>
              )}
            </motion.div>

            <motion.div
              className="member-form-field"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.36, duration: 0.25 }}
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
              transition={{ delay: 0.4, duration: 0.25 }}
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
              transition={{ delay: 0.44, duration: 0.25 }}
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
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </motion.button>
          </div>
        </motion.form>
      </motion.div>

      <DeleteConfirmModal
        open={deleteOpen}
        title="Xác nhận xóa hạng thành viên"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xóa hạng thành viên này không?"
        itemName={data?.name}
        loading={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={onDeleteConfirm}
      />

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
