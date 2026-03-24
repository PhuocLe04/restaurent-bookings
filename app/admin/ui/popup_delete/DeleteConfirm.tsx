'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import './DeleteConfirm.css'

type DeleteConfirmProps = {
  open: boolean
  title?: string
  message?: string
  itemName?: string
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmModal({
  open,
  title = 'Xác nhận xóa',
  message = 'Bạn có chắc muốn xóa mục này không?',
  itemName,
  loading = false,
  onClose,
  onConfirm,
}: DeleteConfirmProps) {
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
          className="delete-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!loading) onClose()
          }}
        >
          <motion.div
            className="delete-popup-modal"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-popup-glow" />

            <div className="delete-popup-header">
              <div className="delete-popup-icon-wrap">
                <div className="delete-popup-icon-ring" />
                <div className="delete-popup-icon">
                  <svg viewBox="0 0 24 24" width="26" height="26">
                    <path
                      fill="currentColor"
                      d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2v-4h2v4z"
                    />
                  </svg>
                </div>
              </div>

              <div className="delete-popup-content">
                <h3 className="delete-popup-title">{title}</h3>
                <p className="delete-popup-message">{message}</p>

                {itemName ? (
                  <div className="delete-popup-item">
                    Mục đã chọn: <strong>{itemName}</strong>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="delete-popup-divider" />

            <div className="delete-popup-actions">
              <button
                type="button"
                className="delete-popup-btn delete-popup-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </button>

              <button
                type="button"
                className="delete-popup-btn delete-popup-btn-danger"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
