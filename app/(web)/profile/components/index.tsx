'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useLiquidMessage } from '@/app/ui/LiquidGlassMessage'

type Membership = {
  id: number
  code: string
  name: string
  min_point: string | number
  discount_percent: number
}

type Staff = {
  id: number
  full_name: string
  role: string
  phone: string | null
  is_active: boolean | null
}

export type ProfileDTO = {
  id: number
  full_name: string
  avatar: string | null
  email: string
  phone: string
  role: string
  member_point: string | number
  membership_id: number
  created_at: string | null
  membership: Membership | null
  staff: Staff | null
}

type UpdateBody = {
  full_name?: string
  avatar?: string | null
  phone?: string
  email?: string
  current_password?: string
  new_password?: string
}

async function fetchJSON<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      ...(init?.headers ?? {}),
      'Content-Type': 'application/json',
    },
  })

  const text = await res.text()
  let json: any = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {}

  if (!res.ok) {
    const msg = (json && json.message) || `Request failed (${res.status})`
    throw new Error(msg)
  }

  return json as T
}

function safeNum(v: string | number | null | undefined) {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  return Number.isFinite(n) ? n : 0
}

function normalizeAvatarUrl(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:image/') ||
    raw.startsWith('blob:')
  ) {
    return raw
  }

  if (raw.startsWith('/')) return raw

  return `/${raw.replace(/^\/+/, '')}`
}

const easeOutSoft: [number, number, number, number] = [0.22, 1, 0.36, 1]

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: easeOutSoft,
      when: 'beforeChildren',
      staggerChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
}

const headerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: easeOutSoft,
    },
  },
}

const leftCardVariants = {
  hidden: { opacity: 0, x: -20, y: 10 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOutSoft,
    },
  },
}

const rightCardVariants = {
  hidden: { opacity: 0, x: 20, y: 10 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOutSoft,
    },
  },
}

const formContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: easeOutSoft,
    },
  },
}

const avatarVariants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: easeOutSoft },
  },
  exit: {
    opacity: 0,
    scale: 1.03,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

export default function ProfileClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileDTO | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState<string>('')
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  const { MessageComponent, showSuccess, showError, showInfo, hideMessage } =
    useLiquidMessage()

  const memberPoint = useMemo(
    () => safeNum(profile?.member_point),
    [profile?.member_point],
  )

  const resolvedAvatar = useMemo(
    () => normalizeAvatarUrl(avatarPreview || avatar || profile?.avatar),
    [avatarPreview, avatar, profile?.avatar],
  )

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchJSON<ProfileDTO>('/api/profile')
        if (!mounted) return

        const normalizedAvatar = normalizeAvatarUrl(data.avatar)

        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
        setAvatar(normalizedAvatar)
        setAvatarPreview(normalizedAvatar)
        setEmail(data.email ?? '')
        setAvatarBroken(false)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? 'Không thể tải thông tin cá nhân')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingAvatar(true)
      setError(null)
      hideMessage()

      const tempPreview = URL.createObjectURL(file)
      setAvatarPreview(tempPreview)
      setAvatarBroken(false)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const text = await res.text()
      let json: any = null

      try {
        json = text ? JSON.parse(text) : null
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || 'Upload ảnh thất bại')
      }

      const imageUrl = normalizeAvatarUrl(json?.url)
      if (!imageUrl) {
        throw new Error('Upload thành công nhưng không nhận được URL ảnh')
      }

      setAvatar(imageUrl)
      setAvatarPreview(imageUrl)
      setAvatarBroken(false)

      showSuccess(
        'Tải ảnh lên thành công. Hãy bấm "Lưu thay đổi" để cập nhật.',
        'Upload thành công',
      )
    } catch (err: any) {
      showError(err?.message || 'Không thể upload ảnh', 'Upload thất bại')
      const fallback = normalizeAvatarUrl(profile?.avatar)
      setAvatarPreview(fallback)
      setAvatar(fallback)
      setAvatarBroken(false)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)
      hideMessage()

      const body: UpdateBody = {}

      const fn = fullName.trim()
      const ph = phone.trim()
      const av = avatar.trim()
      const em = email.trim()

      if (fn && fn !== profile?.full_name) body.full_name = fn
      if (ph && ph !== profile?.phone) body.phone = ph
      if (em && em !== profile?.email) body.email = em
      if (av !== normalizeAvatarUrl(profile?.avatar ?? '')) {
        body.avatar = av ? av : null
      }

      const wantsChangePw = currentPw.trim() && newPw.trim()
      if (wantsChangePw) {
        body.current_password = currentPw.trim()
        body.new_password = newPw.trim()
      }

      if (Object.keys(body).length === 0) {
        showInfo('Không có thay đổi nào được thực hiện.', 'Thông báo')
        return
      }

      const res = await fetchJSON<{ message: string; user: ProfileDTO }>(
        '/api/profile',
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      )

      showSuccess(res.message || 'Cập nhật thành công!', 'Thành công')

      const fresh = await fetchJSON<ProfileDTO>('/api/profile')
      const normalizedAvatar = normalizeAvatarUrl(fresh.avatar)

      setProfile(fresh)
      setFullName(fresh.full_name ?? '')
      setPhone(fresh.phone ?? '')
      setAvatar(normalizedAvatar)
      setAvatarPreview(normalizedAvatar)
      setEmail(fresh.email ?? '')
      setAvatarBroken(false)

      setCurrentPw('')
      setNewPw('')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (e: any) {
      showError(e?.message ?? 'Cập nhật thất bại', 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!profile) return

    const fallback = normalizeAvatarUrl(profile.avatar)
    setFullName(profile.full_name ?? '')
    setPhone(profile.phone ?? '')
    setAvatar(fallback)
    setAvatarPreview(fallback)
    setEmail(profile.email ?? '')
    setCurrentPw('')
    setNewPw('')
    setAvatarBroken(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    showInfo('Đã khôi phục dữ liệu ban đầu.', 'Đặt lại thành công')
  }

  if (loading) {
    return (
      <motion.div
        className="container py-5"
        style={{ backgroundColor: '#0c0b09', minHeight: '100vh' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="spinner-border mb-3"
              style={{ width: '3rem', height: '3rem', color: '#cda45e' }}
              role="status"
            >
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p style={{ color: '#aaa' }}>Đang tải thông tin cá nhân...</p>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  if (error && !profile) {
    return (
      <div
        className="container py-5"
        style={{ backgroundColor: '#0c0b09', minHeight: '100vh' }}
      >
        <div className="row justify-content-center">
          <div className="col-md-6">
            <motion.div
              className="card border-0"
              style={{ backgroundColor: '#1a1814', borderRadius: '15px' }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="card-body p-5 text-center">
                <div className="display-1 mb-4" style={{ color: '#cda45e' }}>
                  🍽️
                </div>
                <h4 className="mb-3" style={{ color: '#cda45e' }}>
                  Có lỗi xảy ra
                </h4>
                <p style={{ color: '#aaa' }} className="mb-4">
                  {error}
                </p>
                <Link
                  href="/login"
                  className="btn px-4 py-2"
                  style={{
                    backgroundColor: '#cda45e',
                    borderColor: '#cda45e',
                    color: '#fff',
                  }}
                >
                  Đi tới Đăng nhập
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div
        className="container py-5"
        style={{ backgroundColor: '#0c0b09', minHeight: '100vh' }}
      >
        <div className="row justify-content-center">
          <div className="col-md-6">
            <motion.div
              className="card border-0"
              style={{ backgroundColor: '#1a1814', borderRadius: '15px' }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="card-body p-5 text-center">
                <div className="display-1 mb-4" style={{ color: '#cda45e' }}>
                  👤
                </div>
                <h4 className="mb-3" style={{ color: '#cda45e' }}>
                  Không tìm thấy thông tin
                </h4>
                <p style={{ color: '#aaa' }}>
                  Vui lòng đăng nhập lại để tiếp tục.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container py-4 py-lg-5 position-relative"
      style={{
        backgroundColor: '#0c0b09',
        minHeight: '100vh',
        color: '#fff',
      }}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <MessageComponent
        position="top-right"
        autoClose={5000}
        glassIntensity="medium"
        bubbleEffect={true}
        glowEffect={true}
        showIcon={true}
        showCloseButton={true}
      />

      <motion.div className="mb-4" variants={headerVariants}>
        <div className="d-flex align-items-center gap-3">
          <h1 className="h2 mb-0 fw-bold" style={{ color: '#cda45e' }}>
            HỒ SƠ CÁ NHÂN
          </h1>
          <motion.div
            className="flex-grow-1"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.45, ease: easeOutSoft }}
            style={{
              height: '2px',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, #cda45e 0%, #cda45e1a 100%)',
            }}
          />
        </div>
        <p style={{ color: '#aaa' }} className="mt-2">
          Cập nhật và quản lý thông tin của bạn
        </p>
      </motion.div>

      <div className="row g-4">
        <motion.div className="col-12 col-lg-5" variants={leftCardVariants}>
          <motion.div
            className="card border-0 h-100"
            whileHover={{
              y: -3,
              boxShadow: '0 16px 36px rgba(205,164,94,0.08)',
            }}
            transition={{ duration: 0.22 }}
            style={{
              backgroundColor: '#1a1814',
              borderRadius: '20px',
              border: '1px solid #cda45e33',
            }}
          >
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div className="d-inline-block">
                  <input
                    id="avatar-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="d-none"
                    disabled={uploadingAvatar}
                  />

                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="Chọn ảnh đại diện"
                    whileHover={uploadingAvatar ? {} : { scale: 1.02 }}
                    whileTap={uploadingAvatar ? {} : { scale: 0.98 }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <motion.div
                      className="rounded-circle border border-3 d-flex align-items-center justify-content-center overflow-hidden"
                      layout
                      transition={{
                        layout: { duration: 0.25, ease: easeOutSoft },
                      }}
                      style={{
                        width: 150,
                        height: 150,
                        margin: '0 auto',
                        background:
                          avatarBroken || !resolvedAvatar
                            ? 'linear-gradient(135deg, #cda45e 0%, #b08c46 100%)'
                            : '#111',
                        borderColor: '#cda45e',
                        boxShadow: '0 10px 30px #cda45e33',
                        position: 'relative',
                      }}
                    >
                      <AnimatePresence mode="wait">
                        {!avatarBroken && resolvedAvatar ? (
                          <motion.img
                            key={resolvedAvatar}
                            src={resolvedAvatar}
                            alt={profile.full_name}
                            loading="lazy"
                            decoding="async"
                            sizes="(max-width: 150px) 150px, 150px"
                            onError={() => setAvatarBroken(true)}
                            variants={avatarVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <motion.span
                            key="fallback-avatar"
                            variants={avatarVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            style={{
                              fontSize: '3rem',
                              fontWeight: 700,
                              color: '#fff',
                              lineHeight: 1,
                            }}
                          >
                            {(profile.full_name || 'U')
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {uploadingAvatar && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="d-flex align-items-center justify-content-center"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.45)',
                            }}
                          >
                            <span
                              className="spinner-border spinner-border-sm"
                              style={{ color: '#fff' }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.button>
                </div>

                <motion.h3
                  className="mt-3 mb-1 fw-bold"
                  style={{ color: '#fff' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, duration: 0.35 }}
                >
                  {profile.full_name}
                </motion.h3>

                <motion.p
                  style={{ color: '#aaa' }}
                  className="mb-0"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.35 }}
                >
                  <i
                    className="bi bi-envelope me-1"
                    style={{ color: '#cda45e' }}
                  ></i>
                  {profile.email}
                </motion.p>
              </div>

              <motion.div
                className="rounded-3 p-3 mb-3"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                style={{
                  backgroundColor: '#0c0b09',
                  borderLeft: '4px solid #cda45e',
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span style={{ color: '#aaa' }}>
                    <i
                      className="bi bi-shield me-2"
                      style={{ color: '#cda45e' }}
                    ></i>
                    Vai trò
                  </span>
                  <span
                    className="badge px-3 py-2 rounded-pill"
                    style={{
                      backgroundColor: '#cda45e',
                      color: '#fff',
                    }}
                  >
                    {profile.role}
                  </span>
                </div>
              </motion.div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <motion.div
                    className="rounded-3 p-3 text-center"
                    whileHover={{ y: -2, scale: 1.015 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px solid #cda45e33',
                    }}
                  >
                    <i
                      className="bi bi-star-fill mb-2"
                      style={{ color: '#cda45e', fontSize: '1.5rem' }}
                    ></i>
                    <div style={{ color: '#aaa' }} className="small">
                      Điểm thành viên
                    </div>
                    <div className="fw-bold fs-5" style={{ color: '#cda45e' }}>
                      {memberPoint.toLocaleString()}
                    </div>
                  </motion.div>
                </div>

                <div className="col-6">
                  <motion.div
                    className="rounded-3 p-3 text-center"
                    whileHover={{ y: -2, scale: 1.015 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px solid #cda45e33',
                    }}
                  >
                    <i
                      className="bi bi-gem mb-2"
                      style={{ color: '#cda45e', fontSize: '1.5rem' }}
                    ></i>
                    <div style={{ color: '#aaa' }} className="small">
                      Hạng thành viên
                    </div>
                    <div className="fw-bold fs-5" style={{ color: '#cda45e' }}>
                      {profile.membership?.name ?? 'Tiêu chuẩn'}
                    </div>
                  </motion.div>
                </div>
              </div>

              <AnimatePresence>
                {profile.staff && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className="rounded-3 p-3"
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px dashed #cda45e',
                      overflow: 'hidden',
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i
                        className="bi bi-person-badge-fill"
                        style={{ color: '#cda45e' }}
                      ></i>
                      <span className="fw-semibold" style={{ color: '#fff' }}>
                        Thông tin nhân viên
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span style={{ color: '#aaa' }}>
                        {profile.staff.full_name}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: '#cda45e33',
                          color: '#cda45e',
                        }}
                      >
                        {profile.staff.role}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>

        <motion.div className="col-12 col-lg-7" variants={rightCardVariants}>
          <motion.div
            className="card border-0"
            whileHover={{
              y: -3,
              boxShadow: '0 16px 36px rgba(205,164,94,0.08)',
            }}
            transition={{ duration: 0.22 }}
            style={{
              backgroundColor: '#1a1814',
              borderRadius: '20px',
              border: '1px solid #cda45e33',
            }}
          >
            <div className="card-body p-4">
              <motion.h4
                className="mb-4"
                style={{ color: '#cda45e' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <i className="bi bi-pencil-square me-2"></i>
                CHỈNH SỬA THÔNG TIN
              </motion.h4>

              <motion.div
                className="row g-4"
                variants={formContainerVariants}
                initial="false"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
              >
                <motion.div className="col-md-12" variants={fieldVariants}>
                  <label
                    className="form-label fw-semibold"
                    style={{ color: '#fff' }}
                  >
                    <i
                      className="bi bi-person me-2"
                      style={{ color: '#cda45e' }}
                    ></i>
                    Họ và tên
                  </label>
                  <input
                    className="form-control form-control-lg"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ tên của bạn"
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px solid #cda45e33',
                      color: '#fff',
                      borderRadius: '10px',
                    }}
                  />
                </motion.div>

                <motion.div className="col-md-6" variants={fieldVariants}>
                  <label
                    className="form-label fw-semibold"
                    style={{ color: '#fff' }}
                  >
                    <i
                      className="bi bi-envelope me-2"
                      style={{ color: '#cda45e' }}
                    ></i>
                    Email
                  </label>
                  <input
                    className="form-control form-control-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Nhập email"
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px solid #cda45e33',
                      color: '#fff',
                      borderRadius: '10px',
                    }}
                  />
                </motion.div>

                <motion.div className="col-md-6" variants={fieldVariants}>
                  <label
                    className="form-label fw-semibold"
                    style={{ color: '#fff' }}
                  >
                    <i
                      className="bi bi-telephone me-2"
                      style={{ color: '#cda45e' }}
                    ></i>
                    Số điện thoại
                  </label>
                  <input
                    className="form-control form-control-lg"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px solid #cda45e33',
                      color: '#fff',
                      borderRadius: '10px',
                    }}
                  />
                </motion.div>

                <motion.div className="col-md-8" variants={fieldVariants}>
                  <label
                    className="form-label fw-semibold"
                    style={{ color: '#fff' }}
                  >
                    <i
                      className="bi bi-link me-2"
                      style={{ color: '#cda45e' }}
                    ></i>
                    URL ảnh đại diện
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    value={avatar ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setAvatar(value)
                      setAvatarPreview(value)
                      setAvatarBroken(false)
                    }}
                    placeholder="Nhập URL ảnh đại diện"
                    style={{
                      backgroundColor: '#0c0b09',
                      border: '1px solid #cda45e33',
                      color: '#fff',
                      borderRadius: '10px',
                    }}
                  />
                </motion.div>

                <motion.div className="col-md-4" variants={fieldVariants}>
                  <label
                    className="form-label fw-semibold"
                    style={{ color: '#fff', visibility: 'hidden' }}
                  >
                    Upload
                  </label>
                  <motion.button
                    className="btn w-100 h-100 d-flex align-items-center justify-content-center gap-2"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    whileHover={uploadingAvatar ? {} : { scale: 1.015 }}
                    whileTap={uploadingAvatar ? {} : { scale: 0.985 }}
                    style={{
                      backgroundColor: '#cda45e33',
                      border: '1px solid #cda45e',
                      color: '#cda45e',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      opacity: uploadingAvatar ? 0.7 : 1,
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {uploadingAvatar ? (
                        <motion.span
                          key="uploading"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="d-inline-flex align-items-center gap-2"
                        >
                          <span className="spinner-border spinner-border-sm" />
                          Đang upload...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="d-inline-flex align-items-center gap-2"
                        >
                          <i className="bi bi-upload"></i>
                          Chọn file
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>

                <motion.div className="col-12" variants={fieldVariants}>
                  <hr style={{ borderColor: '#cda45e33' }} />
                  <h5 className="fw-semibold mb-3" style={{ color: '#cda45e' }}>
                    <i className="bi bi-key me-2"></i>
                    ĐỔI MẬT KHẨU
                  </h5>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label" style={{ color: '#fff' }}>
                        Mật khẩu hiện tại
                      </label>
                      <div className="input-group">
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          className="form-control"
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          placeholder="••••••••"
                          style={{
                            backgroundColor: '#0c0b09',
                            border: '1px solid #cda45e33',
                            color: '#fff',
                            borderRadius: '10px 0 0 10px',
                          }}
                        />
                        <motion.button
                          className="btn"
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            backgroundColor: '#cda45e33',
                            border: '1px solid #cda45e33',
                            color: '#cda45e',
                            borderRadius: '0 10px 10px 0',
                          }}
                        >
                          <i
                            className={`bi bi-${showCurrentPw ? 'eye-slash' : 'eye'}`}
                          ></i>
                        </motion.button>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label" style={{ color: '#fff' }}>
                        Mật khẩu mới
                      </label>
                      <div className="input-group">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          className="form-control"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="••••••••"
                          style={{
                            backgroundColor: '#0c0b09',
                            border: '1px solid #cda45e33',
                            color: '#fff',
                            borderRadius: '10px 0 0 10px',
                          }}
                        />
                        <motion.button
                          className="btn"
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            backgroundColor: '#cda45e33',
                            border: '1px solid #cda45e33',
                            color: '#cda45e',
                            borderRadius: '0 10px 10px 0',
                          }}
                        >
                          <i
                            className={`bi bi-${showNewPw ? 'eye-slash' : 'eye'}`}
                          ></i>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <small style={{ color: '#aaa' }} className="d-block mt-2">
                    <i
                      className="bi bi-info-circle me-1"
                      style={{ color: '#cda45e' }}
                    ></i>
                    Để trống nếu bạn không muốn thay đổi mật khẩu
                  </small>
                </motion.div>

                <motion.div
                  className="col-12 d-flex justify-content-end gap-3 mt-4"
                  variants={fieldVariants}
                >
                  <motion.button
                    className="btn btn-outline-secondary btn-lg px-4"
                    type="button"
                    onClick={handleReset}
                    disabled={saving || uploadingAvatar}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      borderRadius: '10px',
                      borderColor: '#cda45e33',
                      color: '#aaa',
                    }}
                  >
                    <i className="bi bi-arrow-counterclockwise me-2"></i>
                    Đặt lại
                  </motion.button>

                  <motion.button
                    className="btn btn-lg px-4 text-white"
                    type="button"
                    onClick={onSave}
                    disabled={saving || uploadingAvatar}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      borderRadius: '10px',
                      backgroundColor: '#cda45e',
                      borderColor: '#cda45e',
                      minWidth: 170,
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {saving ? (
                        <motion.span
                          key="saving"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="d-inline-flex align-items-center"
                        >
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            style={{ color: '#fff' }}
                          />
                          Đang lưu...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="saved"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="d-inline-flex align-items-center"
                        >
                          <i className="bi bi-check-lg me-2"></i>
                          Lưu thay đổi
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
