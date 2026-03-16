'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useLiquidToast } from '@/app/ui/LiquidToastProvider'
import 'animate.css'

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

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function ProfileClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  // Sử dụng hook Liquid Message
  const {
    showSuccess: showLiquidSuccess,
    showError: showLiquidError,
    showInfo: showLiquidInfo,
  } = useLiquidToast()

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
        setSuccess(null)

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
      setSuccess(null)

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
      showLiquidSuccess(
        'Tải ảnh lên thành công. Hãy bấm "Lưu thay đổi" để cập nhật.',
        'Upload thành công',
      )
    } catch (err: any) {
      showLiquidError(err?.message || 'Không thể upload ảnh', 'Upload thất bại')
      const fallback = normalizeAvatarUrl(profile?.avatar)
      setAvatarPreview(fallback)
      setAvatar(fallback)
      setAvatarBroken(false)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAvatarUrlChange = (url: string) => {
    const normalized = normalizeAvatarUrl(url)
    setAvatar(normalized)
    setAvatarPreview(normalized)
    setAvatarBroken(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

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
        showLiquidInfo('Không có thay đổi nào được thực hiện.', 'Thông báo')
        return
      }

      const res = await fetchJSON<{ message: string; user: ProfileDTO }>(
        '/api/profile',
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      )

      showLiquidSuccess(res.message || 'Cập nhật thành công!', 'Thành công')

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
      showLiquidError(e?.message ?? 'Cập nhật thất bại', 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div
        className="container py-5 animate__animated animate__fadeIn animate__faster"
        style={{ backgroundColor: '#0c0b09', minHeight: '100vh' }}
      >
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <div className="text-center animate__animated animate__fadeInUp animate__faster">
            <div
              className="spinner-border mb-3"
              style={{ width: '3rem', height: '3rem', color: '#cda45e' }}
              role="status"
            >
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p style={{ color: '#aaa' }}>Đang tải thông tin cá nhân...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div
        className="container py-5 animate__animated animate__fadeIn"
        style={{ backgroundColor: '#0c0b09', minHeight: '100vh' }}
      >
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div
              className="card border-0 animate__animated animate__fadeInUp animate__faster"
              style={{ backgroundColor: '#1a1814', borderRadius: '15px' }}
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div
        className="container py-5 animate__animated animate__fadeIn"
        style={{ backgroundColor: '#0c0b09', minHeight: '100vh' }}
      >
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div
              className="card border-0 animate__animated animate__fadeInUp animate__faster"
              style={{ backgroundColor: '#1a1814', borderRadius: '15px' }}
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container py-4 py-lg-5 position-relative animate__animated animate__fadeIn"
      style={{
        backgroundColor: '#0c0b09',
        minHeight: '100vh',
        color: '#fff',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="mb-4 animate__animated animate__fadeInDown animate__faster"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="d-flex align-items-center gap-3">
          <h1 className="h2 mb-0 fw-bold" style={{ color: '#cda45e' }}>
            HỒ SƠ CÁ NHÂN
          </h1>
          <div
            className="flex-grow-1"
            style={{
              height: '2px',
              background: 'linear-gradient(90deg, #cda45e 0%, #cda45e1a 100%)',
            }}
          />
        </div>
        <p style={{ color: '#aaa' }} className="mt-2">
          Cập nhật và quản lý thông tin của bạn
        </p>
      </motion.div>

      <motion.div
        className="row g-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="col-12 col-lg-5 animate__animated animate__fadeInLeft animate__faster"
          variants={fadeInUp}
        >
          <div
            className="card border-0 h-100"
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

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="Chọn ảnh đại diện"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div
                      className="rounded-circle border border-3 d-flex align-items-center justify-content-center overflow-hidden"
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
                      {!avatarBroken && resolvedAvatar ? (
                        <img
                          src={resolvedAvatar}
                          alt={profile.full_name}
                          onError={() => setAvatarBroken(true)}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <span
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
                        </span>
                      )}

                      {uploadingAvatar ? (
                        <div
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
                        </div>
                      ) : null}
                    </div>
                  </button>
                </div>

                <h3 className="mt-3 mb-1 fw-bold" style={{ color: '#fff' }}>
                  {profile.full_name}
                </h3>
                <p style={{ color: '#aaa' }} className="mb-0">
                  <i
                    className="bi bi-envelope me-1"
                    style={{ color: '#cda45e' }}
                  ></i>
                  {profile.email}
                </p>
              </div>

              <div
                className="rounded-3 p-3 mb-3"
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
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <div
                    className="rounded-3 p-3 text-center"
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
                  </div>
                </div>

                <div className="col-6">
                  <div
                    className="rounded-3 p-3 text-center"
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
                  </div>
                </div>
              </div>

              {profile.staff && (
                <div
                  className="rounded-3 p-3"
                  style={{
                    backgroundColor: '#0c0b09',
                    border: '1px dashed #cda45e',
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
                      style={{ backgroundColor: '#cda45e33', color: '#cda45e' }}
                    >
                      {profile.staff.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="col-12 col-lg-7 animate__animated animate__fadeInRight animate__faster"
          variants={fadeInUp}
        >
          <div
            className="card border-0"
            style={{
              backgroundColor: '#1a1814',
              borderRadius: '20px',
              border: '1px solid #cda45e33',
            }}
          >
            <div className="card-body p-4">
              <h4 className="mb-4" style={{ color: '#cda45e' }}>
                <i className="bi bi-pencil-square me-2"></i>
                CHỈNH SỬA THÔNG TIN
              </h4>

              <motion.div
                className="row g-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div className="col-md-12" variants={fadeInUp}>
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

                <motion.div className="col-md-6" variants={fadeInUp}>
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

                <motion.div className="col-md-6" variants={fadeInUp}>
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

                <motion.div className="col-md-8" variants={fadeInUp}>
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

                <motion.div className="col-md-4" variants={fadeInUp}>
                  <label
                    className="form-label fw-semibold"
                    style={{ color: '#fff', visibility: 'hidden' }}
                  >
                    Upload
                  </label>
                  <button
                    className="btn w-100 h-100 d-flex align-items-center justify-content-center gap-2"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    style={{
                      backgroundColor: '#cda45e33',
                      border: '1px solid #cda45e',
                      color: '#cda45e',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      opacity: uploadingAvatar ? 0.7 : 1,
                    }}
                  >
                    {uploadingAvatar ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Đang upload...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-upload"></i>
                        Chọn file
                      </>
                    )}
                  </button>
                </motion.div>

                <motion.div className="col-12" variants={fadeInUp}>
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
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
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
                        </button>
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
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
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
                        </button>
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
                  variants={fadeInUp}
                >
                  <motion.button
                    className="btn btn-outline-secondary btn-lg px-4"
                    type="button"
                    onClick={() => {
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
                    }}
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
                    }}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          style={{ color: '#fff' }}
                        />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Lưu thay đổi
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
