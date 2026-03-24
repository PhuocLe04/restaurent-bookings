'use client'

import 'animate.css'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import './page.css'

type SyncResponse = {
  ok?: boolean
  reason?: string
}

function pick(value: string | null) {
  return value ?? ''
}

export default function MomoReturnPage() {
  const searchParams = useSearchParams()

  const orderId = pick(searchParams.get('orderId'))
  const requestId = pick(searchParams.get('requestId'))
  const amount = pick(searchParams.get('amount'))
  const orderInfo = pick(searchParams.get('orderInfo'))
  const transId = pick(searchParams.get('transId'))
  const resultCode = pick(searchParams.get('resultCode'))
  const message = pick(searchParams.get('message'))

  const success = resultCode === '0'
  const statusText = success
    ? 'Thanh toán thành công'
    : 'Thanh toán không thành công'

  const noteText = success
    ? 'Khoản cọc của bạn đã được ghi nhận thành công trong hệ thống.'
    : message ||
      'Giao dịch chưa hoàn tất. Vui lòng thử lại hoặc chọn phương thức khác.'

  const amountNumber = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const [dbUpdateMessage, setDbUpdateMessage] = useState(
    'Đang đồng bộ trạng thái thanh toán...',
  )
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let ignore = false

    async function syncPayment() {
      try {
        const res = await fetch('/api/payment/momo/return-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            requestId,
            amount,
            orderInfo,
            transId,
            resultCode,
            message,
          }),
        })

        const dbResult: SyncResponse = await res.json()

        if (ignore) return

        if (!dbResult.ok) {
          setDbUpdateMessage('Không tìm thấy thông tin thanh toán để cập nhật.')
        } else if (dbResult.reason === 'ALREADY_SUCCESS') {
          setDbUpdateMessage('Thanh toán đã được xác nhận trước đó.')
        } else {
          setDbUpdateMessage(
            success
              ? 'Hệ thống đã xác nhận thanh toán thành công.'
              : 'Hệ thống đã ghi nhận giao dịch không thành công.',
          )
        }
      } catch {
        if (!ignore) {
          setDbUpdateMessage('Có lỗi khi cập nhật trạng thái thanh toán.')
        }
      } finally {
        if (!ignore) {
          setSyncing(false)
        }
      }
    }

    syncPayment()

    return () => {
      ignore = true
    }
  }, [
    orderId,
    requestId,
    amount,
    orderInfo,
    transId,
    resultCode,
    message,
    success,
  ])

  return (
    <div className="momo-return-page">
      <motion.div
        className="momo-return-shell"
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="momo-return-card">
          <motion.div
            className="momo-return-header animate__animated animate__fadeInDown"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55 }}
          >
            <h1>Kết quả thanh toán</h1>
            <p>Xác nhận trạng thái thanh toán cọc bằng MoMo</p>
          </motion.div>

          <motion.div
            className={`momo-status-box ${success ? 'is-success' : 'is-failed'} animate__animated animate__fadeInUp`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.55 }}
            whileHover={{ y: -3 }}
          >
            <motion.div
              className={`momo-status-icon ${success ? 'is-success' : 'is-failed'}`}
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

            <div className="momo-status-content">
              <motion.div
                className="momo-status-chip"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.34, duration: 0.4 }}
              >
                Thanh toán MoMo
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.45 }}
              >
                {statusText}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.48, duration: 0.45 }}
              >
                {noteText}
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            className="momo-info-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
          >
            <div className="momo-info-title">Thông tin thanh toán</div>

            <div className="momo-info-list">
              <InfoRow
                label="Phương thức thanh toán"
                value="MoMo"
                delay={0.22}
              />
              <InfoRow
                label="Trạng thái"
                value={success ? 'Thành công' : 'Thất bại'}
                valueColor={success ? '#86efac' : '#fca5a5'}
                delay={0.28}
              />
              <InfoRow
                label="Số tiền cọc"
                value={
                  amountNumber > 0
                    ? `${amountNumber.toLocaleString('vi-VN')} đ`
                    : '-'
                }
                delay={0.34}
              />
              <InfoRow
                label="Mã thanh toán"
                value={orderId || '-'}
                delay={0.4}
              />
              {transId ? (
                <InfoRow label="Mã giao dịch" value={transId} delay={0.46} />
              ) : null}
              {orderInfo ? (
                <InfoRow label="Nội dung" value={orderInfo} delay={0.52} />
              ) : null}
            </div>
          </motion.div>

          <motion.div
            className={`momo-db-note ${syncing ? 'is-syncing' : ''} animate__animated animate__fadeInUp`}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.55 }}
          >
            {dbUpdateMessage}
          </motion.div>

          <motion.div
            className="momo-actions animate__animated animate__fadeInUp"
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
                className="momo-btn momo-btn-primary"
              >
                Xem lịch sử đặt bàn
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/payment" className="momo-btn momo-btn-secondary">
                Thử lại
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/" className="momo-btn momo-btn-ghost">
                Về trang chủ
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            className="momo-footer-note"
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
      className="momo-info-row"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42 }}
      whileHover={{ x: 2 }}
    >
      <span className="momo-info-label">{label}</span>

      <strong
        className="momo-info-value"
        style={{ color: valueColor ?? '#fff' }}
      >
        {value}
      </strong>
    </motion.div>
  )
}
