'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet } from 'lucide-react'
import 'animate.css'
import './index.css'

type PaymentMethod = 'momo' | 'cash'

export default function PayMent() {
  const sp = useSearchParams()
  const raw = sp.get('order_id')
  const orderId = raw ? Number(raw) : 0

  const [method, setMethod] = useState<PaymentMethod>('momo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pageTitle = useMemo(() => {
    if (method === 'momo') return 'Thanh toán cọc bằng MoMo'
    return 'Thanh toán tại nhà hàng'
  }, [method])

  async function handlePay() {
    if (!orderId) {
      setError('Thiếu order_id. Ví dụ: /payment?order_id=27')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (method === 'cash') {
        alert(
          'Bạn đã chọn thanh toán tại nhà hàng. Vui lòng thanh toán trực tiếp khi đến nơi.',
        )
        return
      }

      const res = await fetch('/api/payment/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })

      const text = await res.text()
      let data: any

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          `API trả về không phải JSON (${res.status}). Kiểm tra route /api/payment/momo`,
        )
      }

      if (!res.ok) {
        throw new Error(data?.message || 'Thanh toán thất bại')
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
    <div className="reservation-history-page payment-page">
      <div className="container py-4">
        <motion.div
          className="rh-header payment-header"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <h1 className="rh-title animate__animated animate__fadeInDown">
              Thanh toán đơn hàng
            </h1>
            <p className="rh-subtitle animate__animated animate__fadeInUp">
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
                Chọn cách thanh toán phù hợp
              </h2>
              <p className="payment-main-desc">
                Hoàn tất thanh toán nhanh chóng, an toàn và đồng bộ với đơn đặt
                bàn của bạn.
              </p>
            </motion.div>

            <motion.div
              className="payment-order-box"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12, duration: 0.35 }}
            >
              <div className="rh-info-label">Mã đơn hàng</div>
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
                Chọn phương thức thanh toán
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
                      {method === 'momo' ? (
                        <span className="payment-chip">Đang chọn</span>
                      ) : null}
                    </div>
                    <div className="payment-method-desc">
                      Thanh toán qua ví MoMo, chuyển hướng sang cổng thanh toán
                      để hoàn tất giao dịch.
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
                      {method === 'cash' ? (
                        <span className="payment-chip">Đang chọn</span>
                      ) : null}
                    </div>
                    <div className="payment-method-desc">
                      Thanh toán trực tiếp khi đến dùng bữa tại nhà hàng.
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
                    Thanh toán qua MoMo
                  </div>
                  <div className="payment-highlight-text">
                    Sau khi nhấn nút thanh toán, hệ thống sẽ chuyển bạn đến cổng
                    MoMo để hoàn tất giao dịch.
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
                    Thanh toán tại nhà hàng
                  </div>
                  <div className="payment-highlight-text">
                    Bạn sẽ thanh toán trực tiếp tại quầy khi đến nhà hàng.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rh-alert-danger animate__animated animate__headShake"
                >
                  {error}
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="button"
              onClick={handlePay}
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.01, y: -2 }}
              whileTap={loading ? {} : { scale: 0.99 }}
              className={`rh-btn payment-submit-btn ${
                method === 'cash' ? 'payment-submit-cash' : 'rh-btn-primary'
              }`}
            >
              {loading ? (
                <span className="payment-btn-loading">
                  <span className="rh-spinner payment-btn-spinner" />
                  Đang xử lý...
                </span>
              ) : method === 'momo' ? (
                'Thanh toán bằng MoMo'
              ) : (
                'Xác nhận thanh toán tại nhà hàng'
              )}
            </motion.button>

            <p className="payment-note animate__animated animate__fadeInUp">
              {method === 'cash'
                ? '* Bạn sẽ thanh toán trực tiếp tại nhà hàng'
                : '* Môi trường Sandbox – không trừ tiền thật'}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
