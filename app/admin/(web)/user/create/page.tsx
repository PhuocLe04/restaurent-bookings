'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import '../page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

type Membership = {
  id: number
  name: string
  code?: string
  min_point?: number | string
}

type UserRole = 'customer' | 'admin'

type CreateBody = {
  full_name: string
  email: string
  phone: string
  role: UserRole
  member_point: number
  membership_id: number
  avatar: string | null
  password: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
  loading?: boolean
}

function getInitials(name: string) {
  return (name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function roleLabel(role: UserRole) {
  return role === 'admin' ? 'Quản trị' : 'Khách hàng'
}

function fmtNow() {
  return new Date().toLocaleString('vi-VN')
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatNumberVN(value: string | number) {
  const digits = typeof value === 'number' ? String(value) : onlyDigits(value)
  if (!digits) return ''
  return Number(digits).toLocaleString('vi-VN')
}

function getMembershipMinPoint(membership?: Membership | null) {
  const n = Number(membership?.min_point ?? 0)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export default function UserCreatePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const [memberships, setMemberships] = useState<Membership[]>([])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('customer')

  const [memberPointInput, setMemberPointInput] = useState('0')
  const [membershipId, setMembershipId] = useState<number>(1)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [avatarMode, setAvatarMode] = useState<'link' | 'file'>('link')
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const passwordOk = useMemo(() => password.length >= 6, [password])

  const memberPoint = useMemo(() => {
    const digits = onlyDigits(memberPointInput)
    if (!digits) return 0
    const n = Number(digits)
    return Number.isFinite(n) ? n : 0
  }, [memberPointInput])

  const memberPointDisplay = useMemo(() => {
    const digits = onlyDigits(memberPointInput)
    if (!digits) return ''
    return formatNumberVN(digits)
  }, [memberPointInput])

  const selectedMembershipName = useMemo(() => {
    return memberships.find((m) => m.id === membershipId)?.name || '—'
  }, [memberships, membershipId])

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
      key: prev.key + 1,
      loading,
    }))
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  async function fetchMemberships() {
    const res = await fetch('/admin/api/membership', { cache: 'no-store' })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message ?? 'Tải danh sách hạng thành viên thất bại')
    }

    const items: Membership[] = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json)
        ? json
        : []

    setMemberships(items)

    if (items.length > 0) {
      const defaultMembership =
        items.find((m) => m.id === 1) ?? items[0] ?? null

      if (defaultMembership) {
        setMembershipId(defaultMembership.id)
        setMemberPointInput(String(getMembershipMinPoint(defaultMembership)))
      }
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        setError('')
        setLoading(true)
        await fetchMemberships()
      } catch (e: any) {
        const msg = e?.message ?? 'Tải dữ liệu thất bại'
        setError(msg)
        showToast('error', msg, 'Lỗi tải dữ liệu')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    const selected = memberships.find((m) => m.id === membershipId)
    const minPointValue = getMembershipMinPoint(selected)
    setMemberPointInput(String(minPointValue))
  }, [membershipId, memberships])

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'avatar')

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: fd,
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.message ?? 'Tải ảnh lên thất bại')

    const url = json?.url
    if (!url) throw new Error('Phản hồi upload thiếu url')
    return String(url)
  }

  function onPickFile(f: File | null) {
    setAvatarFile(f)

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (!f) {
      setAvatarPreview(null)
      return
    }

    const url = URL.createObjectURL(f)
    objectUrlRef.current = url
    setAvatarPreview(url)
  }

  function onAvatarImgError() {
    setAvatarPreview(null)
    setAvatarUrlInput('')
    setAvatarFile(null)

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  function handleRoleChange(value: string) {
    setRole(value === 'admin' ? 'admin' : 'customer')
  }

  async function onCreate() {
    if (saving) return

    if (!fullName.trim()) {
      const msg = 'Họ và tên là bắt buộc.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    if (!email.trim()) {
      const msg = 'Email là bắt buộc.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    if (!phone.trim()) {
      const msg = 'Số điện thoại là bắt buộc.'
      setError(msg)
      showToast('warning', msg, 'Thiếu thông tin')
      return
    }

    if (!passwordOk) {
      const msg = 'Mật khẩu phải có ít nhất 6 ký tự.'
      setError(msg)
      showToast('warning', msg, 'Mật khẩu chưa hợp lệ')
      return
    }

    try {
      setSaving(true)
      setError('')
      showToast('info', 'Đang tạo người dùng', 'Vui lòng chờ', true)

      let resolvedAvatar: string | null = null

      if (avatarMode === 'link') {
        resolvedAvatar = avatarUrlInput.trim() ? avatarUrlInput.trim() : null
      } else {
        if (avatarFile) resolvedAvatar = await uploadImage(avatarFile)
        else resolvedAvatar = null
      }

      const body: CreateBody = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        member_point: Number(memberPoint),
        membership_id: membershipId || 1,
        avatar: resolvedAvatar,
        password,
      }

      const res = await fetch('/admin/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message ?? 'Tạo người dùng thất bại')

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      showToast(
        'success',
        json?.message ?? 'Tạo người dùng thành công',
        'Thành công',
      )

      setTimeout(() => {
        router.push('/admin/user')
        router.refresh()
      }, 700)
    } catch (e: any) {
      const msg = e?.message ?? 'Tạo người dùng thất bại'
      setError(msg)
      showToast('error', msg, 'Tạo thất bại')
    } finally {
      setSaving(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 12,
      },
    },
  }

  const headerVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  const actionsVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5 },
    },
  }

  const avatarPanelVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
    },
  }

  if (loading) {
    return (
      <motion.div
        className="user-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="user-card">
          <div className="user-td-muted">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              Đang tải...
            </motion.div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        toastKey={toast.key}
        loading={toast.loading}
        autoClose={toast.loading ? 0 : 2600}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        position="top-right"
      />

      <motion.div
        className="user-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="user-head">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="user-h1 animate__animated animate__fadeInUp">
              Tạo người dùng
            </h1>
            <div className="user-muted">
              Tạo hồ sơ người dùng mới trong hệ thống
            </div>
          </motion.div>

          <motion.div
            className="user-head-actions"
            variants={actionsVariants}
            initial="hidden"
            animate="visible"
          >
            <Link className="user-btn" href="/admin/user">
              ← Quay lại
            </Link>
          </motion.div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="user-alert animate__animated animate__shakeX"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              Lỗi: {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="user-card"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.5,
            type: 'spring',
            stiffness: 100,
          }}
        >
          <div className="user-modal-body">
            <motion.div
              className="user-avatar-panel"
              variants={avatarPanelVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="user-avatar-box">
                {avatarPreview ? (
                  <motion.img
                    src={avatarPreview}
                    alt={fullName || 'Ảnh đại diện'}
                    width={80}
                    height={80}
                    onError={onAvatarImgError}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <motion.span
                    className="user-avatar-fallback"
                    whileHover={{ scale: 1.1 }}
                  >
                    {getInitials(fullName)}
                  </motion.span>
                )}
              </div>

              <div className="user-avatar-info">
                <motion.div
                  className="user-avatar-name"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  {fullName.trim() ? fullName : 'Người dùng mới'}
                </motion.div>
                <div className="user-avatar-meta">
                  {email.trim() ? email : 'Email'} ·{' '}
                  {phone.trim() ? phone : 'Số điện thoại'}
                </div>
                <motion.span
                  className={`user-badge user-badge-${role}`}
                  whileHover={{ scale: 1.05 }}
                >
                  {roleLabel(role)}
                </motion.span>
              </div>
            </motion.div>

            <motion.div
              className="user-summary"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {[
                { label: 'Vai trò', value: roleLabel(role), badge: true },
                {
                  label: 'Điểm',
                  value: Number(memberPoint || 0).toLocaleString('vi-VN'),
                },
                { label: 'Ngày tạo', value: fmtNow() },
                { label: 'Hạng thành viên', value: selectedMembershipName },
              ].map((item) => (
                <motion.div key={item.label} variants={itemVariants}>
                  <div className="user-muted-sm">{item.label}</div>
                  <div className="user-strong">
                    {item.badge ? (
                      <span className={`user-badge user-badge-${role}`}>
                        {item.value}
                      </span>
                    ) : (
                      item.value
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="user-divider"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            />

            <motion.form
              className="user-form"
              onSubmit={(e) => {
                e.preventDefault()
                onCreate()
              }}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="user-form-grid">
                <motion.div className="user-form-field" variants={itemVariants}>
                  <label>Họ và tên</label>
                  <motion.input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>

                <motion.div className="user-form-field" variants={itemVariants}>
                  <label>Email</label>
                  <motion.input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>

                <motion.div className="user-form-field" variants={itemVariants}>
                  <label>Số điện thoại</label>
                  <motion.input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>

                <motion.div className="user-form-field" variants={itemVariants}>
                  <label>Điểm thành viên</label>
                  <motion.input
                    type="text"
                    inputMode="numeric"
                    value={memberPointDisplay}
                    onFocus={() => {
                      if (onlyDigits(memberPointInput) === '0') {
                        setMemberPointInput('')
                      }
                    }}
                    onChange={(e) => {
                      const raw = onlyDigits(e.target.value)
                      setMemberPointInput(raw)
                    }}
                    onBlur={() => {
                      const raw = onlyDigits(memberPointInput)
                      setMemberPointInput(
                        raw === '' ? '0' : String(Number(raw)),
                      )
                    }}
                    placeholder="Nhập điểm thành viên..."
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.div>

                <motion.div className="user-form-field" variants={itemVariants}>
                  <label>Vai trò</label>
                  <motion.select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                  >
                    <option value="customer">Khách hàng</option>
                    <option value="admin">Quản trị</option>
                  </motion.select>
                </motion.div>

                <motion.div className="user-form-field" variants={itemVariants}>
                  <label>Hạng thành viên</label>
                  <motion.select
                    value={String(membershipId)}
                    onChange={(e) => {
                      const nextId = Number(e.target.value) || 1
                      setMembershipId(nextId)

                      const selected = memberships.find((m) => m.id === nextId)
                      const minPointValue = getMembershipMinPoint(selected)
                      setMemberPointInput(String(minPointValue))
                    }}
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                  >
                    {memberships.length === 0 ? (
                      <option value="1">Mặc định (ID=1)</option>
                    ) : (
                      memberships.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name}
                        </option>
                      ))
                    )}
                  </motion.select>
                </motion.div>

                <motion.div
                  className="user-form-field user-form-field-full"
                  variants={itemVariants}
                >
                  <label>Ảnh đại diện</label>

                  <div className="user-inline-actions">
                    <motion.button
                      type="button"
                      className={`user-btn ${avatarMode === 'link' ? 'user-primary' : ''}`}
                      onClick={() => {
                        setAvatarMode('link')
                        setAvatarFile(null)

                        if (objectUrlRef.current) {
                          URL.revokeObjectURL(objectUrlRef.current)
                          objectUrlRef.current = null
                        }

                        const v = avatarUrlInput.trim()
                        setAvatarPreview(v ? v : null)
                      }}
                      disabled={saving}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Dùng link
                    </motion.button>

                    <motion.button
                      type="button"
                      className={`user-btn ${avatarMode === 'file' ? 'user-primary' : ''}`}
                      onClick={() => {
                        setAvatarMode('file')
                        setAvatarPreview(null)
                      }}
                      disabled={saving}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Tải lên file
                    </motion.button>

                    {avatarMode === 'file' && (
                      <>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="user-hidden-file"
                          onChange={(e) =>
                            onPickFile(e.target.files?.[0] ?? null)
                          }
                          disabled={saving}
                        />

                        <motion.button
                          type="button"
                          className="user-btn"
                          onClick={() => fileRef.current?.click()}
                          disabled={saving}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Chọn ảnh…
                        </motion.button>

                        {avatarFile && (
                          <motion.span
                            className="user-muted-sm user-file-name"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            {avatarFile.name}
                          </motion.span>
                        )}
                      </>
                    )}
                  </div>

                  {avatarMode === 'link' && (
                    <div className="user-field-stack">
                      <motion.input
                        value={avatarUrlInput}
                        onChange={(e) => {
                          const v = e.target.value
                          setAvatarUrlInput(v)

                          const trimmed = v.trim()
                          setAvatarPreview(trimmed ? trimmed : null)

                          if (objectUrlRef.current) {
                            URL.revokeObjectURL(objectUrlRef.current)
                            objectUrlRef.current = null
                          }

                          setAvatarFile(null)
                        }}
                        placeholder="https://example.com/avatar.jpg"
                        disabled={saving}
                        whileFocus={{ scale: 1.02 }}
                      />
                      <div className="user-muted-sm user-field-hint">
                        Dán URL ảnh công khai (public).
                      </div>
                    </div>
                  )}

                  {avatarMode === 'file' && (
                    <div className="user-muted-sm user-field-hint">
                      Ảnh sẽ được tải lên khi bạn bấm <b>Tạo người dùng</b>.
                    </div>
                  )}
                </motion.div>
              </div>

              <motion.div className="user-password-box" variants={itemVariants}>
                <div className="user-password-title">THIẾT LẬP MẬT KHẨU</div>

                <div className="user-form-field">
                  <label>Mật khẩu</label>
                  <motion.input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    disabled={saving}
                    whileFocus={{ scale: 1.02 }}
                  />
                </div>

                <div className="user-inline-actions user-inline-actions-top">
                  <motion.button
                    type="button"
                    className="user-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={saving}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </motion.button>

                  {!passwordOk && (
                    <motion.div
                      className="user-muted-sm user-text-danger"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Mật khẩu phải có ít nhất 6 ký tự.
                    </motion.div>
                  )}

                  {passwordOk && password && (
                    <motion.div
                      className="user-muted-sm user-text-success"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      Mật khẩu hợp lệ.
                    </motion.div>
                  )}
                </div>
              </motion.div>

              <motion.div className="user-form-actions" variants={itemVariants}>
                <motion.button
                  className="user-btn user-primary"
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={saving ? { opacity: 0.7 } : { opacity: 1 }}
                >
                  {saving ? 'Đang tạo...' : 'Tạo người dùng'}
                </motion.button>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
