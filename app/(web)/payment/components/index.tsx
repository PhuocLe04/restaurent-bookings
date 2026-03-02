'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function PayMent() {
  const sp = useSearchParams()
  const raw = sp.get('order_id')
  const orderId = raw ? Number(raw) : 0

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay() {
    if (!orderId) {
      setError('Missing order_id. Dùng URL: /payment?order_id=27')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/payment/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })

      // ✅ tránh lỗi parse JSON khi server trả HTML (404/500)
      const text = await res.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          `API returned non-JSON (${res.status}). Check /api/payment/momo route.`,
        )
      }

      if (!res.ok) throw new Error(data?.message || 'Payment failed')
      if (!data?.payUrl) throw new Error('payUrl not found')

      window.location.href = data.payUrl
    } catch (e: any) {
      setError(e?.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', textAlign: 'center' }}>
      <h1>Thanh toán cọc MoMo</h1>

      <p>
        Order ID: <b>{orderId || 'N/A'}</b>
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#ae2070',
          color: '#fff',
          borderRadius: 6,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Đang chuyển MoMo...' : 'Thanh toán MoMo'}
      </button>

      <p style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
        * MoMo Sandbox – không trừ tiền thật
      </p>
    </div>
  )
}
