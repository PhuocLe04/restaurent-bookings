'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet } from 'lucide-react'
import 'animate.css'
import './index.css'

type PaymentMethod = 'momo' | 'cash'

export default function PaymentPage() {
  const sp = useSearchParams()
  const router = useRouter()

  const raw = sp.get('order_id')
  const orderId = raw ? Number(raw) : 0

  const [method, setMethod] = useState<PaymentMethod>('momo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pageTitle = useMemo(() => {
    return method === 'momo'
      ? 'Thanh toán đợt cuối bằng MoMo'
      : 'Thanh toán đợt cuối tại nhà hàng'
  }, [method])

  async function handlePay() {
    if (!orderId) {
      setError('Thiếu order_id. Ví dụ: /admin/payments?order_id=66')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const origin = window.location.origin
      const cashReturnUrl = `${origin}/admin/payments/components/return`
      const momoReturnUrl = `${origin}/admin/payments/momo/return`

      const res = await fetch('/admin/api/payments/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          payment_method: method === 'cash' ? 'CASH' : 'MOMO',
          redirect_url:
            method === 'cash'
              ? `${cashReturnUrl}?method=cash&purpose=FINAL`
              : `${momoReturnUrl}?method=momo&purpose=FINAL`,
        }),
      })

      const text = await res.text()
      let data: any

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          `API trả về không phải JSON (${res.status}). Kiểm tra route /admin/api/payments/momo`,
        )
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Thanh toán thất bại')
      }

      if (method === 'cash') {
        const paymentOrderId = data?.order_id || data?.orderId || ''
        const requestId = data?.request_id || data?.requestId || ''
        const amount = Number(data?.amount ?? 0)

        router.push(
          `/admin/payments/components/return?method=cash&status=success&purpose=FINAL&order_id=${orderId}&payment_order_id=${encodeURIComponent(
            paymentOrderId,
          )}&request_id=${encodeURIComponent(requestId)}&amount=${amount}`,
        )
        return
      }

      const redirectUrl = data?.payUrl || data?.paymentUrl || data?.url
      if (!redirectUrl) {
        throw new Error('Không tìm thấy link thanh toán')
      }

      window.location.href = redirectUrl
    } catch (e: any) {
      setError(e?.message || 'Đã xảy ra lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="payment-page">
      <div className="container py-4">
        <motion.div
          className="payment-header"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <h1
              className="animate__animated animate__fadeInDown"
              style={{
                margin: 0,
                color: 'var(--heading-color)',
                fontSize: 'clamp(1.8rem, 3vw, 2.3rem)',
                fontWeight: 800,
              }}
            >
              Thanh toán đơn hàng
            </h1>

            <p
              className="animate__animated animate__fadeInUp"
              style={{
                margin: '10px 0 0',
                color: 'rgba(255,255,255,0.68)',
                fontSize: '1rem',
              }}
            >
              {pageTitle}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="payment-wrap"
          initial={{ opacity: 0, y: 26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45 }}
        >
          <div className="payment-card luxury-glow">
            <motion.div
              className="payment-top-banner"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.35 }}
            >
              <div className="payment-badge">Thanh toán an toàn</div>
              <h2 className="payment-main-title">
                Chọn cách thanh toán đợt cuối
              </h2>
              <p className="payment-main-desc">
                Hệ thống sẽ tự kiểm tra khoản cọc đã thanh toán trước đó và chỉ
                thu phần tiền còn lại của đơn hàng.
              </p>
            </motion.div>

            <motion.div
              className="payment-order-box"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.35 }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.62)',
                  fontSize: '0.88rem',
                  marginBottom: 6,
                }}
              >
                Mã đơn hàng
              </div>

              <div className="payment-order-id">
                Order ID: <strong>{orderId || 'N/A'}</strong>
              </div>
            </motion.div>

            <motion.div
              className="payment-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.35 }}
            >
              <div className="payment-section-title">
                Chọn phương thức thanh toán đợt cuối
              </div>

              <div className="payment-method-list payment-method-list-2">
                <motion.label
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`payment-method-card modern-card ${
                    method === 'momo' ? 'is-active is-momo' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="momo"
                    checked={method === 'momo'}
                    onChange={() => setMethod('momo')}
                  />

                  <div className="payment-method-icon payment-method-icon-momo">
                    <img
                      src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-MoMo-Square-768x768.png"
                      alt="MoMo"
                      className="payment-momo-logo"
                    />
                  </div>

                  <div className="payment-method-content">
                    <div className="payment-method-head">
                      <div className="payment-method-name">MoMo</div>
                      {method === 'momo' && (
                        <span className="payment-chip">Đang chọn</span>
                      )}
                    </div>

                    <div className="payment-method-desc">
                      Thanh toán phần còn lại của đơn hàng qua ví MoMo. Hệ thống
                      sẽ chuyển hướng sang cổng thanh toán để hoàn tất giao
                      dịch.
                    </div>
                  </div>
                </motion.label>

                <motion.label
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`payment-method-card modern-card ${
                    method === 'cash' ? 'is-active is-cash' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={method === 'cash'}
                    onChange={() => setMethod('cash')}
                  />

                  <div className="payment-method-icon payment-method-icon-cash">
                    <Wallet size={26} strokeWidth={2} />
                  </div>

                  <div className="payment-method-content">
                    <div className="payment-method-head">
                      <div className="payment-method-name">
                        Thanh toán tại nhà hàng
                      </div>
                      {method === 'cash' && (
                        <span className="payment-chip">Đang chọn</span>
                      )}
                    </div>

                    <div className="payment-method-desc">
                      Ghi nhận thanh toán tiền mặt cho phần còn lại của đơn hàng
                      ngay trong hệ thống.
                    </div>
                  </div>
                </motion.label>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {method === 'momo' ? (
                <motion.div
                  key="momo-note"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="payment-highlight payment-highlight-momo animate__animated animate__fadeIn"
                >
                  <div className="payment-highlight-title">
                    Thanh toán đợt cuối qua MoMo
                  </div>
                  <div className="payment-highlight-text">
                    Sau khi nhấn nút thanh toán, hệ thống sẽ tự tính số tiền còn
                    lại sau khi trừ khoản cọc đã thanh toán và chuyển bạn đến
                    cổng MoMo để hoàn tất giao dịch.
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cash-note"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="payment-highlight payment-highlight-cash animate__animated animate__fadeIn"
                >
                  <div className="payment-highlight-title">
                    Thanh toán đợt cuối tại nhà hàng
                  </div>
                  <div className="payment-highlight-text">
                    Khi nhấn xác nhận, hệ thống sẽ ghi nhận thanh toán tiền mặt
                    cho phần còn lại của order, cập nhật trạng thái đơn hàng và
                    chuyển bạn đến trang thông báo thành công.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="animate__animated animate__headShake"
                  style={{
                    marginBottom: 16,
                    borderRadius: 16,
                    padding: '14px 16px',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    background:
                      'linear-gradient(180deg, rgba(239,68,68,0.12), rgba(255,255,255,0.02))',
                    color: '#fecaca',
                    fontSize: '0.94rem',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={handlePay}
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.01, y: -2 }}
              whileTap={loading ? {} : { scale: 0.99 }}
              className={`payment-submit-btn ${
                method === 'cash' ? 'payment-submit-cash' : 'payment-badge'
              }`}
              style={
                method === 'momo'
                  ? {
                      width: '100%',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                    }
                  : {
                      width: '100%',
                      justifyContent: 'center',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                    }
              }
            >
              {loading ? (
                <span className="payment-btn-loading">
                  <span
                    className="payment-btn-spinner"
                    style={{
                      borderStyle: 'solid',
                      borderColor: 'currentColor',
                      borderRightColor: 'transparent',
                      borderRadius: '999px',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Đang xử lý...
                </span>
              ) : method === 'momo' ? (
                'Thanh toán đợt cuối bằng MoMo'
              ) : (
                'Xác nhận thanh toán tiền mặt'
              )}
            </motion.button>

            <p className="payment-note animate__animated animate__fadeInUp">
              {method === 'cash'
                ? '* Hệ thống sẽ ghi nhận thanh toán CASH thành công ngay sau khi xác nhận'
                : '* Môi trường Sandbox – không trừ tiền thật'}
            </p>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
