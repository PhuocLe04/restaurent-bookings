'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../page.css'

type CreateBody = {
  code: string
  name: string
  min_point: number
  discount_percent: number
}

export default function MembershipCreatePage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  // ✅ đổi minPoint thành string để dễ xử lý “click vào mất số 0”
  const [minPointInput, setMinPointInput] = useState('0')

  const [discountPercent, setDiscountPercent] = useState<number>(0)

  const minPoint = useMemo(() => {
    const n = Number(minPointInput)
    return Number.isFinite(n) ? n : NaN
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

  // ✅ clamp helper
  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
  }

  function decDiscount() {
    setDiscountPercent((v) => clamp((Number.isFinite(v) ? v : 0) - 1, 0, 100))
  }

  function incDiscount() {
    setDiscountPercent((v) => clamp((Number.isFinite(v) ? v : 0) + 1, 0, 100))
  }

  async function onCreate() {
    if (!code.trim()) return setError('Mã (code) là bắt buộc.')
    if (!name.trim()) return setError('Tên hạng là bắt buộc.')
    if (!minPointOk) return setError('Điểm tối thiểu không hợp lệ.')
    if (!discountOk) return setError('Giảm giá (%) phải trong khoảng 0–100.')

    try {
      setSaving(true)
      setError('')

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
      if (!res.ok)
        throw new Error(json?.message ?? 'Tạo hạng thành viên thất bại')

      alert('Tạo hạng thành viên thành công')
      router.push('/admin/membership')
      router.refresh()
    } catch (e: any) {
      setError(String(e?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="member-page">
      <div className="member-head">
        <div>
          <h1 className="admin-title">Tạo hạng thành viên</h1>
        </div>

        <div className="member-head-actions">
          <Link className="member-btn" href="/admin/membership">
            ← Quay lại
          </Link>
        </div>
      </div>

      {error && <div className="member-alert">Lỗi: {error}</div>}

      <div className="member-card">
        <form
          className="member-form"
          onSubmit={(e) => {
            e.preventDefault()
            onCreate()
          }}
        >
          <div className="member-form-grid">
            <div className="member-form-field">
              <label>Mã hạng (code)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="vd: default, gold, vip..."
                required
              />
            </div>

            <div className="member-form-field">
              <label>Tên hạng</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd: Hạng Bạc, Hạng Vàng..."
                required
              />
            </div>

            {/* ✅ Điểm tối thiểu: click vào nếu đang 0 thì xoá */}
            <div className="member-form-field">
              <label>Điểm tối thiểu</label>
              <input
                type="text"
                inputMode="numeric"
                value={minPointInput}
                onFocus={() => {
                  if (minPointInput.trim() === '0') setMinPointInput('')
                }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '')
                  setMinPointInput(raw)
                }}
                onBlur={() => {
                  if (!minPointInput.trim()) setMinPointInput('0')
                  else setMinPointInput(String(Number(minPointInput) || 0))
                }}
                placeholder="Nhập điểm tối thiểu..."
              />
              {!minPointOk && (
                <div
                  className="member-muted-sm"
                  style={{
                    color: 'rgba(255, 120, 120, 0.9)',
                    marginTop: 6,
                  }}
                >
                  Điểm tối thiểu phải ≥ 0.
                </div>
              )}
            </div>

            {/* ✅ Giảm giá: thêm nút + / - */}
            <div className="member-form-field">
              <label>Giảm giá (%)</label>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="member-btn"
                  onClick={decDiscount}
                  disabled={saving || discountPercent <= 0}
                  aria-label="Giảm 1%"
                  title="Giảm 1%"
                >
                  −
                </button>

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

                <button
                  type="button"
                  className="member-btn"
                  onClick={incDiscount}
                  disabled={saving || discountPercent >= 100}
                  aria-label="Tăng 1%"
                  title="Tăng 1%"
                >
                  +
                </button>
              </div>

              {!discountOk && (
                <div
                  className="member-muted-sm"
                  style={{
                    color: 'rgba(255, 120, 120, 0.9)',
                    marginTop: 6,
                  }}
                >
                  % giảm giá phải trong khoảng 0–100.
                </div>
              )}
            </div>
          </div>

          <div className="member-form-actions">
            <button
              className="member-btn member-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Đang tạo...' : 'Tạo hạng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
