'use client'

import 'animate.css'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import './page.css'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function PaymentReturnPage() {
  const searchParams = useSearchParams()

  const status = searchParams.get('status')
  const orderId = searchParams.get('order_id')
  const paymentOrderId = searchParams.get('payment_order_id')
  const requestId = searchParams.get('request_id')
  const rawAmount = searchParams.get('amount')

  const normalizedStatus = (status ?? '').trim().toLowerCase()
  const success = normalizedStatus === 'success'

  const displayMessage = success
    ? 'Khoản thanh toán tiền mặt của bạn đã được ghi nhận thành công trong hệ thống.'
    : 'Thanh toán tiền mặt chưa hoàn tất. Vui lòng kiểm tra lại với nhân viên nhà hàng.'

  const amountNumber = rawAmount ? Number(rawAmount) : 0

  return (
    <div className="cash-return-page">
      <motion.div
        className="cash-return-shell"
        initial={{ opacity: 0, y: 36, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.72, ease: EASE_OUT_EXPO }}
      >
        <div className="cash-return-card">
          <motion.div
            className="cash-return-header animate__animated animate__fadeInDown"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55 }}
          >
            <h1>Kết quả thanh toán</h1>
            <p>Xác nhận trạng thái thanh toán tiền mặt tại nhà hàng</p>
          </motion.div>

          <motion.div
            className={`cash-status-box ${success ? 'is-success' : 'is-failed'} animate__animated animate__fadeInUp`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.55 }}
            whileHover={{ y: -3 }}
          >
            <motion.div
              className={`cash-status-icon ${success ? 'is-success' : 'is-failed'}`}
              initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                delay: 0.28,
                type: 'spring',
                stiffness: 220,
                damping: 15,
              }}
            >
              {success ? '✓' : '✕'}
            </motion.div>

            <div className="cash-status-content">
              <motion.div
                className="cash-status-chip"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.34, duration: 0.4 }}
              >
                Thanh toán tiền mặt
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.45 }}
              >
                {success
                  ? 'Thanh toán thành công'
                  : 'Thanh toán không thành công'}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.48, duration: 0.45 }}
              >
                {displayMessage}
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            className="cash-info-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
          >
            <div className="cash-info-title">Thông tin thanh toán</div>

            <div className="cash-info-list">
              <InfoRow
                label="Phương thức thanh toán"
                value="Tiền mặt"
                delay={0.22}
              />
              <InfoRow
                label="Trạng thái"
                value={success ? 'Thành công' : 'Thất bại'}
                valueColor={success ? '#86efac' : '#fca5a5'}
                delay={0.28}
              />
              <InfoRow
                label="Số tiền thanh toán"
                value={
                  amountNumber > 0
                    ? `${amountNumber.toLocaleString('vi-VN')} đ`
                    : '-'
                }
                delay={0.34}
              />
              <InfoRow label="Mã đơn hàng" value={orderId || '-'} delay={0.4} />
              <InfoRow
                label="Mã thanh toán"
                value={paymentOrderId || '-'}
                delay={0.46}
              />
              <InfoRow
                label="Request ID"
                value={requestId || '-'}
                delay={0.52}
              />
            </div>
          </motion.div>

          <motion.div
            className="cash-db-note animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.55 }}
          >
            {success ? (
              <>
                Hệ thống đã ghi nhận thanh toán tiền mặt thành công.
                <br />
                <b>Đơn đặt bàn của bạn đã được xác nhận.</b>
              </>
            ) : (
              'Hệ thống đã ghi nhận giao dịch tiền mặt chưa thành công.'
            )}
          </motion.div>

          <motion.div
            className="cash-actions animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.55 }}
          >
            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/reservation-history"
                className="cash-btn cash-btn-primary"
              >
                Xem lịch sử đặt bàn
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/payment" className="cash-btn cash-btn-secondary">
                Thử lại
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/" className="cash-btn cash-btn-ghost">
                Về trang chủ
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            className="cash-footer-note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            Trạng thái cuối cùng vẫn nên được đối chiếu trong lịch sử thanh toán
            nếu cần.
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  valueColor,
  delay = 0,
}: {
  label: string
  value: string
  valueColor?: string
  delay?: number
}) {
  return (
    <motion.div
      className="cash-info-row"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42 }}
      whileHover={{ x: 2 }}
    >
      <span className="cash-info-label">{label}</span>

      <strong
        className="cash-info-value"
        style={{ color: valueColor ?? '#fff' }}
      >
        {value}
      </strong>
    </motion.div>
  )
}
