'use client'

import 'animate.css'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import './page.css'

type SyncResponse = {
  ok?: boolean
  reason?:
    | 'ALREADY_SUCCESS'
    | 'FAILED_UPDATED'
    | 'SUCCESS_UPDATED'
    | 'NOT_FOUND'
    | 'MISSING_IDS'
    | 'INVALID_METHOD'
    | 'SERVER_ERROR'
    | string
  detail?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  key: number
}

function pick(value: string | null) {
  return value ?? ''
}

export default function CashReturnPage() {
  const searchParams = useSearchParams()

  const order_id = pick(searchParams.get('order_id'))
  const payment_order_id = pick(searchParams.get('payment_order_id'))
  const request_id = pick(searchParams.get('request_id'))
  const amount = pick(searchParams.get('amount'))
  const status = pick(searchParams.get('status'))
  const purpose = pick(searchParams.get('purpose')).toUpperCase() || 'FINAL'

  const isFinal = purpose === 'FINAL'
  const success = status.toLowerCase() === 'success'

  const amountNumber = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const paymentTypeLabel = isFinal ? 'Thanh toán đợt cuối' : 'Thanh toán'
  const paymentResultTitle = success
    ? isFinal
      ? 'Thanh toán đợt cuối thành công'
      : 'Thanh toán thành công'
    : isFinal
      ? 'Thanh toán đợt cuối không thành công'
      : 'Thanh toán không thành công'

  const [dbUpdateMessage, setDbUpdateMessage] = useState(
    isFinal
      ? 'Đang đồng bộ trạng thái thanh toán đợt cuối...'
      : 'Đang đồng bộ trạng thái thanh toán...',
  )
  const [syncing, setSyncing] = useState(true)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  function showToast(type: MessageType, title: string, message: string) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
    }))
  }

  function closeToast() {
    setToast((prev) => ({ ...prev, visible: false }))
  }

  useEffect(() => {
    let ignore = false

    async function syncPayment() {
      try {
        console.log('CASH RETURN PARAMS:', {
          order_id,
          payment_order_id,
          request_id,
          amount,
          status,
          purpose,
        })

        const res = await fetch('/admin/api/payments/momo/return-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'cash',
            order_id,
            payment_order_id,
            request_id,
            amount,
            status,
            purpose,
          }),
        })

        const rawText = await res.text()

        let dbResult: SyncResponse = {}
        try {
          dbResult = rawText ? JSON.parse(rawText) : {}
        } catch {
          dbResult = {
            ok: false,
            reason: 'SERVER_ERROR',
            detail: rawText,
          }
        }

        if (ignore) return

        if (!res.ok || !dbResult.ok) {
          let errorMsg = 'Có lỗi khi cập nhật trạng thái thanh toán.'

          if (dbResult.reason === 'NOT_FOUND') {
            errorMsg = 'Không tìm thấy payment để cập nhật trạng thái.'
          } else if (dbResult.reason === 'MISSING_IDS') {
            errorMsg = 'Thiếu mã thanh toán để đồng bộ trạng thái.'
          } else if (dbResult.reason === 'INVALID_METHOD') {
            errorMsg = 'Phương thức thanh toán không hợp lệ.'
          } else if (dbResult.detail) {
            errorMsg = dbResult.detail
          }

          setDbUpdateMessage(errorMsg)
          showToast('error', 'Đồng bộ thất bại', errorMsg)
          return
        }

        if (dbResult.reason === 'FAILED_UPDATED') {
          const msg = 'Hệ thống đã cập nhật trạng thái thanh toán thất bại.'
          setDbUpdateMessage(msg)
          showToast('warning', 'Thanh toán thất bại', msg)
        } else if (dbResult.reason === 'SUCCESS_UPDATED') {
          const msg = 'Hệ thống đã xác nhận thanh toán thành công.'
          setDbUpdateMessage(msg)
          showToast('success', 'Thanh toán thành công', msg)
        } else if (dbResult.reason === 'ALREADY_SUCCESS') {
          const msg = isFinal
            ? 'Thanh toán đợt cuối đã được xác nhận trước đó.'
            : 'Thanh toán đã được xác nhận trước đó.'
          setDbUpdateMessage(msg)
          showToast('success', 'Đã xác nhận trước đó', msg)
        } else {
          const msg = success
            ? 'Hệ thống đã ghi nhận thanh toán thành công.'
            : 'Hệ thống đã ghi nhận thanh toán thất bại.'
          setDbUpdateMessage(msg)
          showToast(success ? 'success' : 'warning', 'Kết quả thanh toán', msg)
        }
      } catch (error) {
        console.error('CASH RETURN SYNC CLIENT ERROR:', error)
        if (!ignore) {
          const msg = 'Có lỗi khi cập nhật trạng thái thanh toán.'
          setDbUpdateMessage(msg)
          showToast('error', 'Lỗi hệ thống', msg)
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
    order_id,
    payment_order_id,
    request_id,
    amount,
    status,
    purpose,
    isFinal,
    success,
  ])

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        autoClose={3500}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
      />

      <div className="cash-return-page">
        <motion.div
          className="cash-return-shell"
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cash-return-card">
            <motion.div
              className="cash-return-header animate__animated animate__fadeInDown"
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.55 }}
            >
              <h1>Kết quả thanh toán</h1>
              <p>Xác nhận trạng thái thanh toán bằng tiền mặt</p>
            </motion.div>

            <motion.div
              className={`cash-status-box ${success ? 'is-success' : 'is-failed'} animate__animated animate__fadeInUp`}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.55 }}
            >
              <div
                className={`cash-status-icon ${success ? 'is-success' : 'is-failed'}`}
              >
                {success ? '✓' : '✕'}
              </div>

              <div className="cash-status-content">
                <div className="cash-status-chip">Tiền mặt</div>
                <h2>{paymentResultTitle}</h2>
                <p>
                  {success
                    ? 'Hệ thống đã ghi nhận thanh toán thành công.'
                    : 'Hệ thống đã ghi nhận thanh toán thất bại.'}
                </p>
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
                <InfoRow label="Phương thức" value="Tiền mặt" delay={0.22} />
                <InfoRow
                  label="Loại thanh toán"
                  value={paymentTypeLabel}
                  delay={0.25}
                />
                <InfoRow
                  label="Trạng thái"
                  value={success ? 'Thành công' : 'Thất bại'}
                  valueColor={success ? '#86efac' : '#fca5a5'}
                  delay={0.3}
                />
                <InfoRow
                  label="Số tiền"
                  value={
                    amountNumber > 0
                      ? `${amountNumber.toLocaleString('vi-VN')} đ`
                      : '-'
                  }
                  delay={0.36}
                />
                <InfoRow
                  label="Order ID"
                  value={order_id || '-'}
                  delay={0.42}
                />
                <InfoRow
                  label="Payment Order ID"
                  value={payment_order_id || '-'}
                  delay={0.48}
                />
                <InfoRow
                  label="Request ID"
                  value={request_id || '-'}
                  delay={0.54}
                />
                <InfoRow label="Status" value={status || '-'} delay={0.6} />
                <InfoRow label="Purpose" value={purpose || '-'} delay={0.66} />
              </div>
            </motion.div>

            <motion.div
              className={`cash-db-note ${syncing ? 'is-syncing' : ''} animate__animated animate__fadeInUp`}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.55 }}
            >
              {dbUpdateMessage}
            </motion.div>

            <motion.div
              className="cash-actions animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.55 }}
            >
              <Link href="/admin/order" className="cash-btn cash-btn-primary">
                Xem danh sách đơn hàng
              </Link>

              {!success && (
                <Link
                  href="/admin/payments"
                  className="cash-btn cash-btn-secondary"
                >
                  Thử lại
                </Link>
              )}
            </motion.div>

            <div className="cash-footer-note">
              Vui lòng kiểm tra lại thông tin thanh toán nếu có sai lệch.
            </div>
          </div>
        </motion.div>
      </div>
    </>
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
