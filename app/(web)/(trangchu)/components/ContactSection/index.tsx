// ContactSection.tsx
'use client'

import { useState } from 'react'
import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaPaperPlane,
  FaCheckCircle,
  FaSpinner,
  FaClock,
  FaFacebookF,
  FaInstagram,
  FaTwitter,
} from 'react-icons/fa'
import './index.css'

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="contact-section">
      {/* Background Decoration */}
      <div className="contact-bg">
        <div className="bg-circle circle-1"></div>
        <div className="bg-circle circle-2"></div>
        <div className="bg-pattern"></div>
      </div>

      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <span className="section-subtitle">LIÊN HỆ</span>
          <h2 className="section-title">
            <span className="title-highlight">Gửi</span> Tin Nhắn Cho Chúng Tôi
          </h2>
          <div className="title-decoration">
            <span className="decoration-line"></span>
            <span className="decoration-dot"></span>
            <span className="decoration-line"></span>
          </div>
          <p className="section-description">
            Chúng tôi luôn sẵn sàng lắng nghe và phục vụ bạn. Hãy để lại tin
            nhắn, đội ngũ của chúng tôi sẽ phản hồi trong vòng 24 giờ.
          </p>
        </div>

        <div className="contact-wrapper">
          {/* Left Column - Info Cards */}
          <div className="info-column">
            {/* Location Card */}
            <div className="info-card">
              <div className="card-icon-wrapper">
                <FaMapMarkerAlt className="card-icon" />
              </div>
              <h3>Địa Chỉ</h3>
              <p>
                8C Đường Tống Hữu Định
                <br />
                Thành Phố Thủ Đức, Hồ Chí Minh
              </p>
              <a href="#" className="card-link">
                Xem bản đồ →
              </a>
            </div>

            {/* Contact Card */}
            <div className="info-card">
              <div className="card-icon-wrapper">
                <FaPhone className="card-icon" />
              </div>
              <h3>Liên Hệ</h3>
              <div className="contact-links">
                <a href="tel:+84358777123">+84 358 777 123</a>
                <a href="mailto:contact@restaurantly.com">
                  contact@restaurantly.com
                </a>
              </div>
              <p className="card-note">Hỗ trợ 24/7</p>
            </div>

            {/* Hours Card */}
            <div className="info-card hours-card">
              <div className="card-icon-wrapper">
                <FaClock className="card-icon" />
              </div>
              <h3>Giờ Mở Cửa</h3>
              <div className="hours-display">
                <div className="hours-item">
                  <span className="days">Thứ 2 - Thứ 5</span>
                  <span className="time">11:00 - 22:00</span>
                </div>
                <div className="hours-item">
                  <span className="days">Thứ 6 - Thứ 7</span>
                  <span className="time">11:00 - 23:00</span>
                </div>
                <div className="hours-item highlight">
                  <span className="days">Chủ Nhật</span>
                  <span className="time">12:00 - 21:00</span>
                </div>
              </div>
            </div>

            {/* Social Card */}
            <div className="info-card social-card">
              <h3>Kết Nối Với Chúng Tôi</h3>
              <div className="social-grid">
                <a href="#" className="social-item">
                  <FaFacebookF />
                  <span>Facebook</span>
                </a>
                <a href="#" className="social-item">
                  <FaInstagram />
                  <span>Instagram</span>
                </a>
                <a href="#" className="social-item">
                  <FaTwitter />
                  <span>Twitter</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column - Map & Form */}
          <div className="form-column">
            {/* Map Container */}
            <div className="map-container">
              <div className="map-overlay"></div>
              <iframe
                title="Bản đồ Restaurantly"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d82741.09728026556!2d106.7040192762702!3d10.801620366265471!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317527098834fe7d%3A0x814d72a39c8b60a!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBRdeG7kWMgdOG6vyBTw6BpIEfDsm4gU0lV!5e0!3m2!1svi!2s!4v1745606221035!5m2!1svi!2s"
                loading="lazy"
                allowFullScreen
              />
              <div className="map-badge">
                <FaMapMarkerAlt />
                <span>Restaurantly - Nhà hàng của bạn</span>
              </div>
            </div>

            {/* Contact Form */}
            <div className="form-card">
              <div className="form-header">
                <h3>Gửi Tin Nhắn</h3>
                <p>Chúng tôi sẽ phản hồi trong vòng 24 giờ</p>
              </div>

              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Họ và tên"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Tiêu đề"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Nội dung tin nhắn"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {submitStatus === 'success' && (
                  <div className="form-message success">
                    <FaCheckCircle />
                    <span>Gửi tin nhắn thành công! Cảm ơn bạn đã liên hệ.</span>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="form-message error">
                    <span>Có lỗi xảy ra. Vui lòng thử lại sau.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="spinner" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      <span>Gửi Tin Nhắn</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
