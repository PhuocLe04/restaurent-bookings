'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../page.css'

type Membership = { id: number; name: string; code?: string }

type CreateBody = {
  full_name: string
  email: string
  phone: string
  role: 'customer' | 'admin'
  member_point: number
  membership_id: number
  avatar: string | null
  password: string
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

function roleLabel(role: 'customer' | 'admin') {
  return role === 'admin' ? 'Quản trị' : 'Khách hàng'
}

export default function UserCreatePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // memberships
  const [memberships, setMemberships] = useState<Membership[]>([])

  // form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'customer' | 'admin'>('customer')
  const [memberPoint, setMemberPoint] = useState<number>(0)
  const [membershipId, setMembershipId] = useState<number>(1) // ✅ mặc định = 1

  // password
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // avatar link/file
  const [avatarMode, setAvatarMode] = useState<'link' | 'file'>('link')
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const passwordOk = useMemo(() => password.length >= 6, [password])

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
    if (!res.ok)
      throw new Error(json?.message ?? 'Tải danh sách hạng thành viên thất bại')

    const items: Membership[] = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json)
        ? json
        : []

    setMemberships(items)

    // ✅ đảm bảo mặc định 1 có tồn tại; nếu không thì lấy phần tử đầu tiên
    if (items.length > 0) {
      const has1 = items.some((m) => m.id === 1)
      if (!has1) setMembershipId(items[0].id)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        setError('')
        setLoading(true)
        await fetchMemberships()
      } catch (e: any) {
        setError(e?.message ?? 'Tải dữ liệu thất bại')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'avatar') // ✅ dùng chung route upload

    const res = await fetch('/api/upload', { method: 'POST', body: fd })
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

  async function onCreate() {
    // basic validate
    if (!fullName.trim()) return setError('Họ và tên là bắt buộc.')
    if (!email.trim()) return setError('Email là bắt buộc.')
    if (!passwordOk) return setError('Mật khẩu phải có ít nhất 6 ký tự.')

    try {
      setSaving(true)
      setError('')

      // resolve avatar
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
        member_point: Number.isFinite(memberPoint) ? Number(memberPoint) : 0,
        membership_id: membershipId || 1, // ✅ nếu không chọn => 1
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

      // cleanup blob
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      alert('Tạo người dùng thành công')
      router.push('/admin/user')
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Tạo người dùng thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="user-page">
        <div className="user-card">
          <div className="user-td-muted">Đang tải...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="user-page">
      <div className="user-head">
        <div>
          <h1 className="user-h1">Tạo người dùng</h1>
          <div className="user-muted">Thêm người dùng mới vào hệ thống</div>
        </div>

        <div className="user-head-actions">
          <Link className="user-btn" href="/admin/user">
            ← Quay lại
          </Link>
        </div>
      </div>

      {error && <div className="user-alert">Lỗi: {error}</div>}

      <div className="user-card">
        <div className="user-modal-body">
          {/* Header / Avatar preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '18px',
              padding: '16px',
              border: '1px solid var(--admin-border)',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(205, 164, 94, 0.3)',
                background: 'rgba(205, 164, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={fullName || 'Ảnh đại diện'}
                  width={80}
                  height={80}
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={onAvatarImgError}
                />
              ) : (
                <span
                  style={{ fontSize: 32, fontWeight: 800, color: '#cda45e' }}
                >
                  {getInitials(fullName)}
                </span>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: 4,
                }}
              >
                {fullName.trim() ? fullName : 'Người dùng mới'}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: 8,
                }}
              >
                {email.trim() ? email : 'Email'} ·{' '}
                {phone.trim() ? phone : 'Số điện thoại'}
              </div>
              <span className={`user-badge user-badge-${role}`}>
                {roleLabel(role)}
              </span>
            </div>
          </div>

          <div className="user-divider" />

          <form
            className="user-form"
            onSubmit={(e) => {
              e.preventDefault()
              onCreate()
            }}
          >
            <div className="user-form-grid">
              <div className="user-form-field">
                <label>Họ và tên</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="user-form-field">
                <label>Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="user-form-field">
                <label>Số điện thoại</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="user-form-field">
                <label>Vai trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="admin">Quản trị</option>
                </select>
              </div>

              <div className="user-form-field">
                <label>Điểm thành viên</label>
                <input
                  type="number"
                  value={memberPoint}
                  onChange={(e) => setMemberPoint(Number(e.target.value))}
                  min={0}
                />
              </div>

              {/* ✅ Membership select (default 1) */}
              <div className="user-form-field">
                <label>Hạng thành viên</label>
                <select
                  value={String(membershipId)}
                  onChange={(e) => setMembershipId(Number(e.target.value) || 1)}
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
                </select>
                <div className="user-muted-sm" style={{ marginTop: 6 }}>
                  Nếu không chọn, mặc định là hạng thành viên #1.
                </div>
              </div>

              {/* ✅ Avatar link or file */}
              <div className="user-form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Ảnh đại diện</label>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <button
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
                  >
                    Dùng link
                  </button>

                  <button
                    type="button"
                    className={`user-btn ${avatarMode === 'file' ? 'user-primary' : ''}`}
                    onClick={() => {
                      setAvatarMode('file')
                      setAvatarPreview(null)
                    }}
                  >
                    Tải lên file
                  </button>

                  {avatarMode === 'file' && (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) =>
                          onPickFile(e.target.files?.[0] ?? null)
                        }
                      />
                      <button
                        type="button"
                        className="user-btn"
                        onClick={() => fileRef.current?.click()}
                      >
                        Chọn ảnh…
                      </button>
                      {avatarFile && (
                        <span
                          className="user-muted-sm"
                          style={{ opacity: 0.85 }}
                        >
                          {avatarFile.name}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {avatarMode === 'link' && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      value={avatarUrlInput}
                      onChange={(e) => {
                        const v = e.target.value
                        setAvatarUrlInput(v)
                        const trimmed = v.trim()
                        setAvatarPreview(trimmed ? trimmed : null)

                        // reset file & blob nếu chuyển từ file
                        if (objectUrlRef.current) {
                          URL.revokeObjectURL(objectUrlRef.current)
                          objectUrlRef.current = null
                        }
                        setAvatarFile(null)
                      }}
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <div className="user-muted-sm" style={{ marginTop: 6 }}>
                      Dán URL ảnh công khai (public).
                    </div>
                  </div>
                )}

                {avatarMode === 'file' && (
                  <div className="user-muted-sm" style={{ marginTop: 10 }}>
                    Ảnh sẽ được tải lên khi bạn bấm <b>Tạo người dùng</b>.
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div
              style={{
                marginTop: 14,
                padding: 14,
                border: '1px solid var(--admin-border)',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div
                className="user-muted-sm"
                style={{ fontSize: 11, marginBottom: 10 }}
              >
                THIẾT LẬP MẬT KHẨU
              </div>

              <div className="user-form-field">
                <label>Mật khẩu</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  className="user-btn"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>

                {!passwordOk && (
                  <div
                    className="user-muted-sm"
                    style={{ color: 'rgba(255, 120, 120, 0.9)' }}
                  >
                    Mật khẩu phải có ít nhất 6 ký tự.
                  </div>
                )}

                {passwordOk && password && (
                  <div
                    className="user-muted-sm"
                    style={{ color: 'rgba(120, 255, 180, 0.85)' }}
                  >
                    Mật khẩu hợp lệ.
                  </div>
                )}
              </div>
            </div>

            <div className="user-form-actions">
              <button
                className="user-btn user-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
