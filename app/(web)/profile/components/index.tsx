'use client'

import { useEffect, useMemo, useState } from 'react'

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
    credentials: 'include', // ✅ để gửi cookie web_user_id
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

export default function ProfileClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileDTO | null>(null)

  // form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState<string>('')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  const memberPoint = useMemo(
    () => safeNum(profile?.member_point),
    [profile?.member_point],
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        setOk(null)

        const data = await fetchJSON<ProfileDTO>('/api/profile')
        if (!mounted) return

        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
        setAvatar(data.avatar ?? '')
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message ?? 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const onSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setOk(null)

      const body: UpdateBody = {}

      const fn = fullName.trim()
      const ph = phone.trim()
      const av = avatar.trim()

      if (fn && fn !== profile?.full_name) body.full_name = fn
      if (ph && ph !== profile?.phone) body.phone = ph

      // avatar nullable
      if (av !== (profile?.avatar ?? '')) body.avatar = av ? av : null

      const wantsChangePw = currentPw.trim() && newPw.trim()
      if (wantsChangePw) {
        body.current_password = currentPw
        body.new_password = newPw
      }

      if (Object.keys(body).length === 0) {
        setOk('Không có gì thay đổi.')
        return
      }

      const res = await fetchJSON<{ message: string; user: ProfileDTO }>(
        '/api/profile',
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      )

      setOk(res.message || 'Updated')
      // reload profile mới nhất
      const fresh = await fetchJSON<ProfileDTO>('/api/profile')
      setProfile(fresh)

      setCurrentPw('')
      setNewPw('')
    } catch (e: any) {
      setError(e?.message ?? 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="alert alert-secondary mb-0">Đang tải profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger mb-3">{error}</div>
        <a className="btn btn-dark" href="/login">
          Đi tới Login
        </a>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning mb-0">Không tìm thấy profile.</div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">My Profile</h1>
          <p className="text-muted mb-0">Cập nhật thông tin cá nhân của bạn</p>
        </div>
      </div>

      {ok ? <div className="alert alert-success">{ok}</div> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="row g-3">
        {/* Left: avatar + quick info */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle bg-light"
                  style={{
                    width: 64,
                    height: 64,
                    backgroundImage:
                      avatar || profile.avatar
                        ? `url(${avatar || profile.avatar})`
                        : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                />
                <div className="flex-grow-1">
                  <div className="fw-semibold">{profile.full_name}</div>
                  <div className="text-muted small">{profile.email}</div>
                </div>
              </div>

              <hr />

              <div className="d-flex justify-content-between">
                <span className="text-muted">Role</span>
                <span className="fw-semibold">{profile.role}</span>
              </div>

              <div className="d-flex justify-content-between mt-2">
                <span className="text-muted">Member points</span>
                <span className="fw-semibold">{memberPoint}</span>
              </div>

              <div className="d-flex justify-content-between mt-2">
                <span className="text-muted">Membership</span>
                <span className="fw-semibold">
                  {profile.membership?.name ?? '—'}
                </span>
              </div>

              {profile.staff ? (
                <>
                  <hr />
                  <div className="fw-semibold mb-2">Staff</div>
                  <div className="small text-muted">
                    {profile.staff.full_name} • {profile.staff.role}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Full name</label>
                  <input
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ tên"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Số điện thoại"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Avatar URL</label>
                  <input
                    className="form-control"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-12">
                  <hr />
                  <div className="fw-semibold mb-2">
                    Change password (optional)
                  </div>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Current password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">New password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <small className="text-muted">
                        Nếu bạn không muốn đổi mật khẩu, để trống 2 ô này.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setFullName(profile.full_name ?? '')
                      setPhone(profile.phone ?? '')
                      setAvatar(profile.avatar ?? '')
                      setCurrentPw('')
                      setNewPw('')
                      setOk(null)
                      setError(null)
                    }}
                    disabled={saving}
                  >
                    Reset
                  </button>

                  <button
                    className="btn btn-dark"
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
