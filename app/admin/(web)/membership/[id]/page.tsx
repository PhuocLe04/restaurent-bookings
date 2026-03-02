'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import '../page.css'

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

export default function MembershipDetailPage() {
  const params = useParams()
  const id = params?.id
  const router = useRouter()

  const [data, setData] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [minPoint, setMinPoint] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)

  const isDefault = useMemo(() => Number(id) === 1, [id])
  const discountOk = useMemo(
    () => discountPercent >= 0 && discountPercent <= 100,
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
      if (!res.ok) throw new Error(json?.message ?? 'Tải membership thất bại')

      const m: Membership = json
      setData(m)
      setCode(m.code ?? '')
      setName(m.name ?? '')
      setMinPoint(Number(m.min_point ?? 0))
      setDiscountPercent(Number(m.discount_percent ?? 0))
    } catch (e: any) {
      setError(String(e?.message ?? e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function onSave() {
    if (!data) return
    if (!code.trim()) return setError('Mã (code) là bắt buộc.')
    if (!name.trim()) return setError('Tên hạng là bắt buộc.')
    if (!minPointOk) return setError('Điểm tối thiểu không hợp lệ.')
    if (!discountOk) return setError('Giảm giá (%) phải trong khoảng 0–100.')

    try {
      setSaving(true)
      setError('')

      const body: PatchBody = {
        code: code.trim(),
        name: name.trim(),
        min_point: Number(minPoint),
        discount_percent: Math.floor(Number(discountPercent)),
      }

      const res = await fetch(`/admin/api/membership/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message ?? 'Cập nhật thất bại')

      alert('Cập nhật thành công')
      await fetchDetail()
      router.refresh()
    } catch (e: any) {
      setError(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    const ok = confirm(`Xóa hạng thành viên #${id}?`)
    if (!ok) return
    try {
      const res = await fetch(`/admin/api/membership/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message ?? 'Xóa thất bại')

      alert('Xóa thành công')
      router.push('/admin/membership')
      router.refresh()
    } catch (e: any) {
      alert(String(e?.message ?? e))
    }
  }

  if (loading) {
    return (
      <div className="member-page">
        <div className="member-card">
          <div className="member-td-muted">Đang tải...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="member-page">
        <div className="member-head">
          <div>
            <h1 className="member-h1">Membership #{String(id ?? '')}</h1>
          </div>
          <div className="member-head-actions">
            <Link className="member-btn" href="/admin/membership">
              ← Quay lại
            </Link>
          </div>
        </div>

        <div className="member-alert">
          {error || 'Không tìm thấy membership'}
        </div>
      </div>
    )
  }

  return (
    <div className="member-page">
      <div className="member-head">
        <div>
          <h1 className="member-h1">Hạng thành viên #{data.id}</h1>
          <div className="member-muted">
            {data.name} · <span className="member-strong">{data.code}</span>
          </div>
        </div>

        <div className="member-head-actions">
          <Link className="member-btn" href="/admin/membership">
            ← Quay lại
          </Link>
          <button
            className="member-btn member-danger"
            onClick={onDelete}
            disabled={isDefault}
          >
            Xóa
          </button>
          <button className="member-btn" onClick={fetchDetail}>
            Làm mới
          </button>
        </div>
      </div>

      {error && <div className="member-alert">Lỗi: {error}</div>}

      <div className="member-card">
        {/* Header với badge */}
        <div
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
          <div
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
          </div>
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
                <span className="member-badge member-badge-default">
                  Mặc định
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '13px',
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
        </div>

        {/* Summary Cards */}
        <div
          className="member-summary"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '16px',
              border: '1px solid var(--admin-border)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div className="member-muted-sm" style={{ marginBottom: '8px' }}>
              Mã hạng
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#cda45e',
                fontFamily: 'monospace',
              }}
            >
              {data.code}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--admin-border)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div className="member-muted-sm" style={{ marginBottom: '8px' }}>
              Giảm giá
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#4caf50',
              }}
            >
              {Number(data.discount_percent ?? 0)}%
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--admin-border)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div className="member-muted-sm" style={{ marginBottom: '8px' }}>
              Điểm tối thiểu
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              {Number(data.min_point).toLocaleString()}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--admin-border)',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div className="member-muted-sm" style={{ marginBottom: '8px' }}>
              Số người dùng
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              {Number(data.usersCount ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Thông tin thời gian */}
        <div
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
        </div>

        <div
          className="member-divider"
          style={{
            height: '1px',
            background: 'var(--admin-border)',
            margin: '20px 0',
          }}
        />

        {/* Form chỉnh sửa */}
        <form
          className="member-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
          }}
        >
          <h3
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
            <div className="member-form-field">
              <label>Mã hạng (code)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isDefault}
                placeholder="VD: BASIC, PREMIUM..."
              />
              {isDefault && (
                <div
                  className="member-muted-sm"
                  style={{ marginTop: 6, color: 'rgba(205, 164, 94, 0.8)' }}
                >
                  ⚠️ Hạng mặc định không thể đổi mã
                </div>
              )}
            </div>

            <div className="member-form-field">
              <label>Tên hạng</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="VD: Cơ bản, Cao cấp..."
              />
            </div>

            <div className="member-form-field">
              <label>Điểm tối thiểu</label>
              <input
                type="number"
                value={minPoint}
                onChange={(e) => setMinPoint(Number(e.target.value))}
                min={0}
                step={1000}
              />
              {!minPointOk && (
                <div
                  className="member-muted-sm"
                  style={{ color: '#ff6b6b', marginTop: 6 }}
                >
                  ❌ Điểm tối thiểu phải ≥ 0
                </div>
              )}
            </div>

            <div className="member-form-field">
              <label>Giảm giá (%)</label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                min={0}
                max={100}
                step={1}
              />
              {!discountOk && (
                <div
                  className="member-muted-sm"
                  style={{ color: '#ff6b6b', marginTop: 6 }}
                >
                  ❌ % giảm giá phải trong khoảng 0–100
                </div>
              )}
            </div>
          </div>

          <div className="member-form-actions">
            <button
              className="member-btn member-primary"
              type="submit"
              disabled={saving}
              style={{ minWidth: '120px' }}
            >
              {saving ? 'Đang lưu...' : ' Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
