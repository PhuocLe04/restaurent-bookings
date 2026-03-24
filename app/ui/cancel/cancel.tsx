'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import './cancel.css'

type CancelReservationModalProps = {
  open: boolean
  loading?: boolean
  reservationCode?: string | number
  onClose: () => void
  onConfirm: () => void
}

export default function CancelReservationModal({
  open,
  loading = false,
  reservationCode,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cancel-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!loading) onClose()
          }}
        >
          <motion.div
            className="cancel-popup-modal"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cancel-popup-glow" />

            <div className="cancel-popup-header">
              <div className="cancel-popup-icon-wrap">
                <div className="cancel-popup-icon-ring" />
                <div className="cancel-popup-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26">
                    <path
                      fill="currentColor"
                      d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2v-4h2v4z"
                    />
                  </svg>
                </div>
              </div>

              <div className="cancel-popup-content">
                <h3 className="cancel-popup-title">Xác nhận hủy đơn đặt bàn</h3>
                <p className="cancel-popup-message">
                  Bạn có chắc muốn hủy đơn đặt bàn này không? Sau khi hủy, hệ
                  thống sẽ đóng đơn hàng liên quan và bạn sẽ không thể tiếp tục
                  thanh toán.
                </p>

                {reservationCode ? (
                  <div className="cancel-popup-item">
                    Đơn đang chọn: <strong>#{reservationCode}</strong>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="cancel-popup-warning-list">
              <div className="cancel-popup-warning-title">
                Khi hủy, khách hàng cần lưu ý:
              </div>

              <ul>
                <li>Đơn đặt bàn bị hủy sẽ không hoàn lại cọc.</li>
              </ul>
            </div>

            <div className="cancel-popup-divider" />

            <div className="cancel-popup-actions">
              <button
                type="button"
                className="cancel-popup-btn cancel-popup-btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Quay lại
              </button>

              <button
                type="button"
                className="cancel-popup-btn cancel-popup-btn-danger"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
