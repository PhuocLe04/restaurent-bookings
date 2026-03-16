'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import './index.css'
import 'animate.css'

import {
  useWebAuthStore,
  getDefaultTokenExpiry,
} from '@/app/(web)/lib/auth-store'

import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [toastVisible, setToastVisible] = useState(false)
  const [toastType, setToastType] = useState<MessageType>('info')
  const [toastTitle, setToastTitle] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastKey, setToastKey] = useState(0)
  const [toastAutoClose, setToastAutoClose] = useState(4000)
  const [toastLoading, setToastLoading] = useState(false)

  const showToast = (
    type: MessageType,
    title: string,
    message: string,
    autoClose = 4000,
    loading = false,
  ) => {
    setToastVisible(false)

    setTimeout(() => {
      setToastType(type)
      setToastTitle(title)
      setToastMessage(message)
      setToastAutoClose(autoClose)
      setToastLoading(loading)
      setToastKey((prev) => prev + 1)
      setToastVisible(true)
    }, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setToastVisible(false)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg =
          typeof data?.message === 'string' && data.message.trim()
            ? data.message
            : res.status === 401
              ? 'Email hoặc mật khẩu không đúng.'
              : res.status >= 500
                ? 'Máy chủ đang bận. Vui lòng thử lại sau.'
                : 'Đăng nhập thất bại. Vui lòng kiểm tra lại.'

        showToast('error', 'Không thể đăng nhập', msg, 5000)
        return
      }

      const token: string | undefined = data.token
      const tokenExpireAt: string =
        data.tokenExpireAt ?? getDefaultTokenExpiry()
      const userId: string | undefined = data.user?.id
        ? String(data.user.id)
        : undefined

      if (token) {
        useWebAuthStore.getState().setAuth(token, tokenExpireAt, userId)
      }

      if (data.user) {
        useWebAuthStore.getState().setProfile({
          id: String(data.user.id),
          full_name: data.user.full_name ?? null,
          email: data.user.email ?? null,
          phone: data.user.phone ?? null,
        })
      }

      showToast(
        'success',
        'Đăng nhập thành công',
        'Đăng nhập thành công! Đang chuyển hướng',
        1800,
        true,
      )

      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1500)
    } catch {
      showToast(
        'error',
        'Không thể kết nối',
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
        5000,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <LiquidGlassMessage
        toastKey={toastKey}
        type={toastType}
        title={toastTitle}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        autoClose={toastAutoClose}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        loading={toastLoading}
      />

      <div className="login-container">
        <AnimatePresence mode="wait">
          <motion.div
            className="login-split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Left Column - Welcome Section */}
            <motion.div
              className="welcome-section"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="welcome-content">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  Chào mừng đến với
                </motion.h1>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  Nhà hàng Restaurantly
                </motion.h2>

                <motion.p
                  className="welcome-text"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  Vui lòng đăng nhập để truy cập hệ thống quản lý và trải nghiệm
                  những dịch vụ tốt nhất từ chúng tôi.
                </motion.p>

                <div className="social-section">
                  <motion.p
                    className="social-label"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
                  >
                    Kết nối với chúng tôi
                  </motion.p>

                  <motion.div
                    className="social-icons"
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: {
                        transition: {
                          staggerChildren: 0.12,
                          delayChildren: 0.72,
                        },
                      },
                    }}
                  >
                    <motion.a
                      href="#"
                      className="social-icon facebook"
                      aria-label="Facebook"
                      variants={{
                        hidden: { opacity: 0, y: 18, scale: 0.88 },
                        show: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            duration: 0.45,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}
                      whileHover={{
                        y: -6,
                        scale: 1.08,
                        rotate: -3,
                        transition: { duration: 0.22, ease: 'easeOut' },
                      }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <span className="social-icon-glow" />
                      <span className="social-icon-ring" />
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <path
                          fill="currentColor"
                          d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z"
                        />
                      </svg>
                    </motion.a>

                    <motion.a
                      href="#"
                      className="social-icon instagram"
                      aria-label="Instagram"
                      variants={{
                        hidden: { opacity: 0, y: 18, scale: 0.88 },
                        show: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            duration: 0.45,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}
                      whileHover={{
                        y: -6,
                        scale: 1.08,
                        rotate: 3,
                        transition: { duration: 0.22, ease: 'easeOut' },
                      }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <span className="social-icon-glow" />
                      <span className="social-icon-ring" />
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <path
                          fill="currentColor"
                          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
                        />
                      </svg>
                    </motion.a>

                    <motion.a
                      href="#"
                      className="social-icon tiktok"
                      aria-label="TikTok"
                      variants={{
                        hidden: { opacity: 0, y: 18, scale: 0.88 },
                        show: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            duration: 0.45,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}
                      whileHover={{
                        y: -6,
                        scale: 1.08,
                        rotate: -2,
                        transition: { duration: 0.22, ease: 'easeOut' },
                      }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <span className="social-icon-glow" />
                      <span className="social-icon-ring" />
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <path
                          fill="currentColor"
                          d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
                        />
                      </svg>
                    </motion.a>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Login Form */}
            <motion.div
              className="form-section"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="glass-card">
                <div className="glass-header">
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.35 }}
                  >
                    Đăng nhập
                  </motion.h2>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="glass-form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      className="glass-input"
                      type="email"
                      placeholder="Nhập email của bạn"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>

                  <div className="glass-form-group">
                    <label htmlFor="password">Mật khẩu</label>
                    <div className="password-wrapper">
                      <input
                        id="password"
                        className="glass-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg
                            className="eye-icon"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                          >
                            <path
                              fill="currentColor"
                              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="eye-icon"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                          >
                            <path
                              fill="currentColor"
                              d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    className="glass-button"
                    disabled={loading}
                    type="submit"
                    whileHover={!loading ? { y: -2 } : undefined}
                    whileTap={!loading ? { scale: 0.98 } : undefined}
                    transition={{ duration: 0.15 }}
                  >
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Đang đăng nhập...
                      </>
                    ) : (
                      'Đăng nhập'
                    )}
                  </motion.button>
                </form>

                <div className="glass-footer">
                  <p>
                    <Link className="glass-link" href="/quen-mat-khau">
                      Quên mật khẩu?
                    </Link>
                  </p>
                  <p>
                    Chưa có tài khoản?{' '}
                    <Link className="glass-link" href="/register">
                      Đăng ký ngay
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
