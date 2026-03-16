'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import 'animate.css'
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaUtensils,
  FaChevronRight,
  FaPaperPlane,
  FaHeart,
} from 'react-icons/fa'
import './footer.css'

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const colVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
    setSubscribed(true)
    setEmail('')
    setTimeout(() => setSubscribed(false), 3000)
  }

  return (
    <footer className="footer">
      {/* Wave Decoration */}
      <div className="footer-wave">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
          ></path>
          <path d="M0,0V15.81C13,21.25,27.93,25.67,44.24,28.45c69.76,11.55,139.42,7.8,208.34-6.05C334.45,8.72,403.49,-4.87,472.22,5.45c63.14,9.54,126.28,26.35,187.42,41.49,65.41,16.19,131.36,27.69,198.18,19.75C923.26,59.76,1007.38,34.48,1080,10.66c28.21-8.88,57.14-18.68,87.47-18.68,31.26,0,59.44,9.91,81.45,21.5L1200,0Z"></path>
        </svg>
      </div>

      <div className="footer-main">
        <div className="container">
          <motion.div
            className="footer-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {/* Column 1: Brand & Info */}
            <motion.div
              className="footer-col brand-col animate__animated animate__fadeInUp"
              variants={colVariants}
            >
              <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                <Link href="/" className="footer-logo">
                  <motion.span
                    whileHover={{ rotate: -6, scale: 1.06 }}
                    transition={{ duration: 0.22 }}
                  >
                    <FaUtensils className="logo-icon" />
                  </motion.span>

                  <div className="logo-text">
                    <span className="logo-name">Restaurantly</span>
                    <span className="logo-slogan">Tinh hoa ẩm thực</span>
                  </div>
                </Link>
              </motion.div>

              <motion.p className="brand-desc" variants={itemVariants}>
                Trải nghiệm ẩm thực đẳng cấp với những món ăn tinh tế, không
                gian sang trọng và dịch vụ chuyên nghiệp.
              </motion.p>

              <motion.div className="info-list" variants={containerVariants}>
                <motion.div className="info-item" variants={itemVariants}>
                  <FaMapMarkerAlt className="info-icon" />
                  <span>
                    8C Đường Tống Hữu Định, Thành Phố Thủ Đức, Hồ Chí Minh
                  </span>
                </motion.div>

                <motion.div className="info-item" variants={itemVariants}>
                  <FaPhone className="info-icon" />
                  <a href="tel:+84358777123">+84 336 428 471</a>
                </motion.div>

                <motion.div className="info-item" variants={itemVariants}>
                  <FaEnvelope className="info-icon" />
                  <a href="mailto:contact@restaurantly.com">
                    Lehuuphuoc0804z@gmail.com
                  </a>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Column 2: Quick Links */}
            <motion.div
              className="footer-col animate__animated animate__fadeInUp"
              variants={colVariants}
            >
              <h4 className="footer-title">Liên Kết Nhanh</h4>

              <motion.ul
                className="footer-links"
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <motion.li variants={itemVariants}>
                  <Link href="/">
                    <FaChevronRight /> Trang Chủ
                  </Link>
                </motion.li>
                <motion.li variants={itemVariants}>
                  <Link href="/#about">
                    <FaChevronRight /> Giới Thiệu
                  </Link>
                </motion.li>
                <motion.li variants={itemVariants}>
                  <Link href="/menu">
                    <FaChevronRight /> Thực Đơn
                  </Link>
                </motion.li>
                <motion.li variants={itemVariants}>
                  <Link href="/reservations">
                    <FaChevronRight /> Đặt Bàn
                  </Link>
                </motion.li>
                <motion.li variants={itemVariants}>
                  <Link href="/contact">
                    <FaChevronRight /> Liên Hệ
                  </Link>
                </motion.li>
              </motion.ul>
            </motion.div>

            {/* Column 3: Opening Hours */}
            <motion.div
              className="footer-col animate__animated animate__fadeInUp"
              variants={colVariants}
            >
              <h4 className="footer-title">Giờ Mở Cửa</h4>

              <motion.ul
                className="hours-list"
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <motion.li
                  className="hours-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.03 }}
                >
                  <span className="hours-day">Thứ 2 - Chủ Nhật</span>

                  <motion.span
                    className="hours-time"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.2 }}
                  >
                    07:30 - 23:30
                  </motion.span>
                </motion.li>
              </motion.ul>
              <motion.div
                className="chef-note"
                variants={itemVariants}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FaHeart className="chef-icon" />
                <span>Đầu bếp sẵn sàng phục vụ bạn</span>
              </motion.div>
            </motion.div>

            {/* Column 4: Newsletter */}
            <motion.div
              className="footer-col animate__animated animate__fadeInUp"
              variants={colVariants}
            >
              <h4 className="footer-title">Nhận Tin Khuyến Mãi</h4>
              <p className="newsletter-desc">
                Đăng ký để nhận ưu đãi đặc biệt và sự kiện mới nhất
              </p>

              <form onSubmit={handleSubscribe} className="newsletter-form">
                <motion.div
                  className="form-group"
                  whileFocus={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email của bạn"
                    required
                    disabled={loading}
                  />
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { y: -2, scale: 1.03 } : undefined}
                    whileTap={!loading ? { scale: 0.96 } : undefined}
                    transition={{ duration: 0.18 }}
                  >
                    {loading ? (
                      <span className="spinner"></span>
                    ) : (
                      <FaPaperPlane />
                    )}
                  </motion.button>
                </motion.div>

                {subscribed && (
                  <motion.div
                    className="success-popup"
                    initial={{ opacity: 0, y: -10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    Đăng ký thành công! Cảm ơn bạn.
                  </motion.div>
                )}
              </form>

              <div className="social-section">
                <h5>Theo dõi chúng tôi</h5>
                <motion.div
                  className="social-links"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                >
                  <motion.a
                    href="#"
                    aria-label="Facebook"
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FaFacebookF />
                  </motion.a>

                  <motion.a
                    href="#"
                    aria-label="Instagram"
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FaInstagram />
                  </motion.a>

                  <motion.a
                    href="#"
                    aria-label="Tiktok"
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FaTiktok />
                  </motion.a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Footer Bottom */}
      <motion.div
        className="footer-bottom"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="container">
          <div className="copyright">
            © {new Date().getFullYear()} <strong>Restaurantly</strong>. Đã đăng
            ký bản quyền.
          </div>
          <div className="legal-links">
            <Link href="/terms">Điều Khoản</Link>
            <span className="separator">|</span>
            <Link href="/privacy">Bảo Mật</Link>
            <span className="separator">|</span>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
