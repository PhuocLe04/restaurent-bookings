'use client'

import 'animate.css'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import './LiquidGlassMessage.css'

export type MessageType = 'info' | 'success' | 'warning' | 'error'

export interface LiquidGlassMessageProps {
  type?: MessageType
  title?: string
  message: string
  isVisible: boolean
  onClose?: () => void
  autoClose?: number
  showIcon?: boolean
  showCloseButton?: boolean
  glassIntensity?: 'light' | 'medium' | 'heavy'
  bubbleEffect?: boolean
  glowEffect?: boolean
  position?:
    | 'top'
    | 'bottom'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
  toastKey?: number
  loading?: boolean
}

type BubbleConfig = {
  id: number
  initialX: number
  initialY: number
  animateX: number
  animateY: number
  scale: number
  duration: number
  delay: number
}

function createBubbleConfig(count = 8): BubbleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    initialX: Math.random() * 160 - 80,
    initialY: Math.random() * 120 - 60,
    animateX: Math.random() * 36 - 18,
    animateY: -Math.random() * 30 - 10,
    scale: Math.random() * 0.45 + 0.35,
    duration: Math.random() * 2 + 2.4,
    delay: Math.random() * 1.4,
  }))
}

function getIcon(type: MessageType) {
  switch (type) {
    case 'success':
      return (
        <svg
          className="liquid-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
      )

    case 'warning':
      return (
        <svg
          className="liquid-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
          />
        </svg>
      )

    case 'error':
      return (
        <svg
          className="liquid-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
      )

    default:
      return (
        <svg
          className="liquid-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
      )
  }
}

function getIconAnimation(type: MessageType) {
  switch (type) {
    case 'success':
      return 'animate__animated animate__zoomIn animate__faster'
    case 'warning':
      return 'animate__animated animate__headShake animate__faster'
    case 'error':
      return 'animate__animated animate__shakeX animate__faster'
    default:
      return 'animate__animated animate__fadeIn animate__faster'
  }
}

export default function LiquidGlassMessage({
  type = 'info',
  title,
  message,
  isVisible,
  onClose,
  autoClose = 4000,
  showIcon = true,
  showCloseButton = true,
  glassIntensity = 'medium',
  bubbleEffect = true,
  glowEffect = true,
  position = 'top-right',
  toastKey = 0,
  loading = false,
}: LiquidGlassMessageProps) {
  const [mounted, setMounted] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const bubbles = useMemo(() => createBubbleConfig(8), [])

  useEffect(() => {
    setMounted(true)

    return () => {
      setMounted(false)
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (!isVisible || autoClose <= 0) return

    closeTimerRef.current = window.setTimeout(() => {
      onClose?.()
    }, autoClose)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [isVisible, autoClose, onClose, toastKey])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={toastKey}
          className={[
            'liquid-glass-message',
            type,
            `glass-${glassIntensity}`,
            `position-${position}`,
            loading ? 'is-loading' : '',
          ].join(' ')}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.96 }}
          transition={{
            duration: 0.24,
            ease: 'easeOut',
          }}
        >
          {glowEffect && <div className="liquid-glow" />}

          {bubbleEffect && (
            <div className="liquid-bubbles" aria-hidden="true">
              {bubbles.map((bubble) => (
                <motion.div
                  key={bubble.id}
                  className="bubble"
                  initial={{
                    x: bubble.initialX,
                    y: bubble.initialY,
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{
                    x: [bubble.initialX, bubble.animateX],
                    y: [bubble.initialY, bubble.animateY],
                    scale: [0, bubble.scale],
                    opacity: [0, 0.55, 0],
                  }}
                  transition={{
                    duration: bubble.duration,
                    repeat: Infinity,
                    delay: bubble.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          )}

          <div className="liquid-content">
            {showIcon && (
              <motion.div
                className={`liquid-icon-wrapper ${getIconAnimation(type)}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 240,
                  damping: 18,
                  delay: 0.04,
                }}
              >
                {getIcon(type)}
              </motion.div>
            )}

            <div className="liquid-text">
              {title ? (
                <div
                  key={`title-${toastKey}`}
                  className="liquid-title animate__animated animate__fadeInUp animate__faster"
                >
                  <span className="liquid-title-row">
                    {loading && <span className="liquid-inline-spinner" />}
                    <span>{title}</span>
                  </span>
                </div>
              ) : null}

              <div
                key={`message-${toastKey}`}
                className="liquid-message animate__animated animate__fadeInUp animate__faster"
              >
                {message}
                {loading && (
                  <span className="liquid-dots" aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                )}
              </div>
            </div>

            {showCloseButton && (
              <motion.button
                type="button"
                className="liquid-close"
                onClick={onClose}
                whileHover={{ scale: 1.08, rotate: 90 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Đóng thông báo"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </motion.button>
            )}
          </div>

          <motion.div
            className="liquid-progress"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{
              duration: autoClose > 0 ? autoClose / 1000 : 0,
              ease: 'linear',
            }}
            style={{ transformOrigin: 'left center' }}
          />

          <div className="liquid-wave" aria-hidden="true">
            <div className="wave wave1" />
            <div className="wave wave2" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
