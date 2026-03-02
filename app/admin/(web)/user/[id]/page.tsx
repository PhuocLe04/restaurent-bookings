'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import '../page.css'

type User = {
  id: number
  full_name: string
  email: string
  phone: string
  role: string
  member_point: number
  avatar: string | null
  membership_id?: number
  created_at: string | null
  membership?: { id: number; name: string; code?: string } | null
}

type PatchBody = {
  full_name?: string
  email?: string
  phone?: string
  role?: string
  member_point?: number
  avatar?: string | null
  new_password?: string
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

function fmtDateTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Quản trị'
  if (role === 'customer') return 'Khách hàng'
  return role
}

export default function UserDetailPage() {
  const params = useParams()
  const id = params?.id
  const router = useRouter()

  const fileRef = useRef<HTMLInputElement | null>(null)

  // ✅ theo dõi blob url để revoke
  const objectUrlRef = useRef<string | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // đổi mật khẩu (✅ không confirm)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // avatar: link hoặc file
  const [avatarMode, setAvatarMode] = useState<'link' | 'file'>('link')
  const [avatarUrlInput, setAvatarUrlInput] = useState('') // input link
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const membershipName = useMemo(() => {
    return user?.membership?.name || '—'
  }, [user?.membership?.name])

  const passwordOk = useMemo(() => {
    if (!newPassword) return true
    return newPassword.length >= 6
  }, [newPassword])

  // ✅ cleanup blob url khi unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  async function fetchUser() {
    try {
      setError('')
      setLoading(true)

      const res = await fetch(`/admin/api/user/${id}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)

      if (!res.ok)
        throw new Error(data?.message ?? 'Tải thông tin người dùng thất bại')

      // ✅ nếu có blob url thì revoke trước khi thay preview
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      setUser(data)
      setAvatarUrlInput(data?.avatar ?? '')
      setAvatarPreview(data?.avatar ?? null)
      setAvatarFile(null)
      setAvatarMode('link')
    } catch (e: any) {
      setError(e?.message ?? 'Tải thông tin người dùng thất bại')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function uploadAvatar(file: File): Promise<string> {
    // ✅ POST /api/upload (multipart/form-data) -> { url }
    const fd = new FormData()
    fd.append('file', file)

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

  async function onSave() {
    if (!user) return

    // validate password (không confirm)
    if (!passwordOk) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    try {
      setSaving(true)
      setError('')

      // 1) resolve avatar (link hoặc upload)
      let resolvedAvatar: string | null = null
      if (avatarMode === 'link') {
        resolvedAvatar = avatarUrlInput.trim() ? avatarUrlInput.trim() : null
      } else {
        if (avatarFile) {
          resolvedAvatar = await uploadAvatar(avatarFile)
        } else {
          // không chọn file -> giữ nguyên avatar hiện tại
          resolvedAvatar = user.avatar ?? null
        }
      }

      const body: PatchBody = {
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        member_point: user.member_point,
        avatar: resolvedAvatar,
      }

      if (newPassword) body.new_password = newPassword

      const res = await fetch(`/admin/api/user/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)

      if (!res.ok) throw new Error(json?.message ?? 'Cập nhật thất bại')

      // reset password + file
      setNewPassword('')
      setShowPassword(false)
      setAvatarFile(null)

      // ✅ nếu đang dùng blob preview, revoke sau khi lưu
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      alert('Cập nhật thành công')
      await fetchUser()
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Cập nhật thất bại')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = confirm(`Xóa người dùng #${id}?`)
    if (!ok) return
    try {
      const res = await fetch(`/admin/api/user/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message ?? 'Xóa thất bại')
      router.push('/admin/user')
      router.refresh()
    } catch (e: any) {
      alert(e?.message ?? 'Xóa thất bại')
    }
  }

  function onPickFile(f: File | null) {
    setAvatarFile(f)

    // ✅ revoke object url cũ
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (!f) {
      setAvatarPreview(user?.avatar ?? null)
      return
    }

    const url = URL.createObjectURL(f)
    objectUrlRef.current = url
    setAvatarPreview(url)
  }

  function onAvatarImgError() {
    // URL hỏng / 403 / hotlink chặn => fallback chữ cái
    setAvatarPreview(null)
    setAvatarUrlInput('')
    setAvatarFile(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
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

  if (error || !user) {
    return (
      <div className="user-page">
        <div className="user-head">
          <div>
            <h1 className="user-h1">Người dùng #{String(id ?? '')}</h1>
          </div>
          <div className="user-head-actions">
            <Link className="user-btn" href="/admin/user">
              ← Quay lại
            </Link>
          </div>
        </div>
        <div className="user-alert">{error || 'Không tìm thấy người dùng'}</div>
      </div>
    )
  }

  return (
    <div className="user-page">
      <div className="user-head">
        <div>
          <h1 className="user-h1">Người dùng #{user.id}</h1>
          <div className="user-muted">
            {user.full_name} · {user.email}
          </div>
        </div>

        <div className="user-head-actions">
          <Link className="user-btn" href="/admin/user">
            ← Quay lại
          </Link>
          <button className="user-btn user-danger" onClick={handleDelete}>
            Xóa
          </button>
          <button className="user-btn" onClick={fetchUser}>
            Làm mới
          </button>
        </div>
      </div>

      {error && <div className="user-alert">Lỗi: {error}</div>}

      <div className="user-card">
        <div className="user-modal-body">
          {/* Header / Avatar */}
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
                  alt={user.full_name}
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
                  {getInitials(user.full_name)}
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
                {user.full_name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: 8,
                }}
              >
                {user.email} · {user.phone || '—'}
              </div>
              <span className={`user-badge user-badge-${user.role}`}>
                {roleLabel(user.role)}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div
            className="user-summary"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '18px',
              padding: '12px',
              border: '1px solid var(--admin-border)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div>
              <div className="user-muted-sm">Vai trò</div>
              <div className="user-strong">
                <span className={`user-badge user-badge-${user.role}`}>
                  {roleLabel(user.role)}
                </span>
              </div>
            </div>
            <div>
              <div className="user-muted-sm">Điểm</div>
              <div className="user-strong">
                {Number(user.member_point || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="user-muted-sm">Ngày tham gia</div>
              <div className="user-strong">{fmtDateTime(user.created_at)}</div>
            </div>
            <div>
              <div className="user-muted-sm">Hạng thành viên</div>
              <div className="user-strong">{membershipName || 'Chưa có'}</div>
            </div>
          </div>

          <div className="user-divider" />

          {/* Edit form */}
          <form
            className="user-form"
            onSubmit={(e) => {
              e.preventDefault()
              onSave()
            }}
          >
            <div className="user-form-grid">
              <div className="user-form-field">
                <label>Họ và tên</label>
                <input
                  value={user.full_name}
                  onChange={(e) =>
                    setUser({ ...user, full_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="user-form-field">
                <label>Email</label>
                <input
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  required
                />
              </div>

              <div className="user-form-field">
                <label>Số điện thoại</label>
                <input
                  value={user.phone || ''}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                />
              </div>

              <div className="user-form-field">
                <label>Vai trò</label>
                <select
                  value={user.role}
                  onChange={(e) => setUser({ ...user, role: e.target.value })}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="admin">Quản trị</option>
                </select>
              </div>

              <div className="user-form-field">
                <label>Điểm thành viên</label>
                <input
                  type="number"
                  value={Number(user.member_point ?? 0)}
                  onChange={(e) =>
                    setUser({ ...user, member_point: Number(e.target.value) })
                  }
                  min={0}
                />
              </div>

              {/* ✅ Avatar link hoặc file */}
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

                      // reset file state
                      setAvatarFile(null)
                      if (objectUrlRef.current) {
                        URL.revokeObjectURL(objectUrlRef.current)
                        objectUrlRef.current = null
                      }

                      const v = (avatarUrlInput || user.avatar || '').trim()
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
                      // giữ avatar hiện tại làm preview cho tới khi user chọn file
                      setAvatarPreview(user.avatar ?? null)
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

                        // nếu trước đó chọn file -> reset file và revoke blob url
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
                    Ảnh sẽ được tải lên khi bạn bấm <b>Lưu thay đổi</b>.
                  </div>
                )}
              </div>
            </div>

            {/* Đổi mật khẩu (✅ không confirm) */}
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
                ĐỔI MẬT KHẨU
              </div>

              <div className="user-form-field">
                <label>Mật khẩu mới</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
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

                {newPassword && passwordOk && (
                  <div
                    className="user-muted-sm"
                    style={{ color: 'rgba(120, 255, 180, 0.85)' }}
                  >
                    Mật khẩu sẽ được cập nhật khi bấm Lưu.
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
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
