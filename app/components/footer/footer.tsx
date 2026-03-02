// Footer.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  FaTwitter,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaUtensils,
  FaChevronRight,
  FaPaperPlane,
  FaHeart,
} from 'react-icons/fa'
import './footer.css'

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
          <div className="footer-grid">
            {/* Column 1: Brand & Info */}
            <div className="footer-col brand-col">
              <Link href="/" className="footer-logo">
                <FaUtensils className="logo-icon" />
                <div className="logo-text">
                  <span className="logo-name">Restaurantly</span>
                  <span className="logo-slogan">Tinh hoa ẩm thực</span>
                </div>
              </Link>

              <p className="brand-desc">
                Trải nghiệm ẩm thực đẳng cấp với những món ăn tinh tế, không
                gian sang trọng và dịch vụ chuyên nghiệp.
              </p>

              <div className="info-list">
                <div className="info-item">
                  <FaMapMarkerAlt className="info-icon" />
                  <span>
                    8C Đường Tống Hữu Định, Thành Phố Thủ Đức, Hồ Chí Minh
                  </span>
                </div>
                <div className="info-item">
                  <FaPhone className="info-icon" />
                  <a href="tel:+84358777123">+84 358 777 123</a>
                </div>
                <div className="info-item">
                  <FaEnvelope className="info-icon" />
                  <a href="mailto:contact@restaurantly.com">
                    contact@restaurantly.com
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="footer-col">
              <h4 className="footer-title">Liên Kết Nhanh</h4>
              <ul className="footer-links">
                <li>
                  <Link href="/">
                    <FaChevronRight /> Trang Chủ
                  </Link>
                </li>
                <li>
                  <Link href="/#about">
                    <FaChevronRight /> Giới Thiệu
                  </Link>
                </li>
                <li>
                  <Link href="/menu">
                    <FaChevronRight /> Thực Đơn
                  </Link>
                </li>
                <li>
                  <Link href="/reservation">
                    <FaChevronRight /> Đặt Bàn
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <FaChevronRight /> Liên Hệ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Opening Hours */}
            <div className="footer-col">
              <h4 className="footer-title">Giờ Mở Cửa</h4>
              <ul className="hours-list">
                <li>
                  <span>Thứ 2 - Thứ 5:</span>
                  <span className="hours-time">11:00 - 22:00</span>
                </li>
                <li>
                  <span>Thứ 6 - Thứ 7:</span>
                  <span className="hours-time">11:00 - 23:00</span>
                </li>
                <li className="sunday">
                  <span>Chủ Nhật:</span>
                  <span className="hours-time">12:00 - 21:00</span>
                </li>
              </ul>
              <div className="chef-note">
                <FaHeart className="chef-icon" />
                <span>Đầu bếp sẵn sàng phục vụ bạn</span>
              </div>
            </div>

            {/* Column 4: Newsletter */}
            <div className="footer-col">
              <h4 className="footer-title">Nhận Tin Khuyến Mãi</h4>
              <p className="newsletter-desc">
                Đăng ký để nhận ưu đãi đặc biệt và sự kiện mới nhất
              </p>

              <form onSubmit={handleSubscribe} className="newsletter-form">
                <div className="form-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email của bạn"
                    required
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading}>
                    {loading ? (
                      <span className="spinner"></span>
                    ) : (
                      <FaPaperPlane />
                    )}
                  </button>
                </div>
                {subscribed && (
                  <div className="success-popup">
                    Đăng ký thành công! Cảm ơn bạn.
                  </div>
                )}
              </form>

              <div className="social-section">
                <h5>Theo dõi chúng tôi</h5>
                <div className="social-links">
                  <a href="#" aria-label="Facebook">
                    <FaFacebookF />
                  </a>
                  <a href="#" aria-label="Instagram">
                    <FaInstagram />
                  </a>
                  <a href="#" aria-label="Twitter">
                    <FaTwitter />
                  </a>
                  <a href="#" aria-label="LinkedIn">
                    <FaLinkedinIn />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
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
      </div>
    </footer>
  )
}
