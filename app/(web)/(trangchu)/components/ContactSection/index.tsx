'use client'

import { motion } from 'framer-motion'
import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaRegEnvelope,
  FaRegMap,
  FaTiktok,
} from 'react-icons/fa'
import './index.css'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 90,
      damping: 14,
    },
  },
}

const socialItems = [
  {
    icon: FaFacebookF,
    name: 'Facebook',
    label: 'Fanpage chính thức',
    handle: '@restaurantly.vn',
    href: 'https://facebook.com',
    color: '#1877f2',
    accentClass: 'facebook',
  },
  {
    icon: FaInstagram,
    name: 'Instagram',
    label: 'Hình ảnh & không gian',
    handle: '@restaurantly.vn',
    href: 'https://instagram.com',
    color: '#e4405f',
    accentClass: 'instagram',
  },
  {
    icon: FaTiktok,
    name: 'TikTok',
    label: 'Video trải nghiệm',
    handle: '@restaurantly.vn',
    href: 'https://tiktok.com',
    color: '#ffffff',
    accentClass: 'tiktok',
  },
]

export default function ContactSection() {
  return (
    <section id="contact" className="contact-section">
      <div className="contact-bg">
        <motion.div
          className="bg-circle circle-1"
          animate={{
            scale: [1, 1.12, 1],
            rotate: [0, 45, 0],
            opacity: [0.22, 0.34, 0.22],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="bg-circle circle-2"
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [45, 0, 45],
            opacity: [0.16, 0.28, 0.16],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <div className="bg-pattern" />
      </div>

      <div className="container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7 }}
        >
          <div className="subtitle-wrapper">
            <span className="section-subtitle">
              <FaRegEnvelope className="subtitle-icon" />
              <span className="subtitle-text">LIÊN HỆ VỚI CHÚNG TÔI</span>
            </span>
          </div>

          <h2 className="section-title">
            Kết nối với <span className="title-highlight">Restaurantly</span>
          </h2>

          <div className="title-decoration">
            <span className="decoration-line" />
            <span className="decoration-dot" />
            <span className="decoration-line" />
          </div>
        </motion.div>

        <motion.div
          className="contact-wrapper"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <motion.div className="info-column" variants={containerVariants}>
            <motion.div
              className="info-card glass-effect"
              variants={itemVariants}
              whileHover={{ y: -6 }}
            >
              <div className="card-icon-wrapper">
                <FaRegMap className="card-icon" />
              </div>
              <h3>Địa chỉ</h3>
              <p className="address-text">
                8C Đường Tống Hữu Định
                <br />
                Phường Thảo Điền, TP. Thủ Đức
              </p>
              <motion.a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="card-link"
                whileHover={{ x: 4 }}
              >
                Xem chỉ đường <FaMapMarkerAlt className="link-icon" />
              </motion.a>
            </motion.div>

            <motion.div
              className="info-card glass-effect"
              variants={itemVariants}
              whileHover={{ y: -6 }}
            >
              <div className="card-icon-wrapper">
                <FaPhone className="card-icon" />
              </div>
              <h3>Liên hệ</h3>

              <div className="contact-links">
                <motion.a href="tel:+84336428471" whileHover={{ x: 4 }}>
                  <FaPhone className="contact-icon" />
                  <span>+84 336 428 471</span>
                </motion.a>

                <motion.a
                  href="mailto:Lehuuphuoc0804z@gmail.com"
                  whileHover={{ x: 4 }}
                >
                  <FaEnvelope className="contact-icon" />
                  <span>Lehuuphuoc0804z@gmail.com</span>
                </motion.a>
              </div>
            </motion.div>

            <motion.div
              className="info-card glass-effect social-card"
              variants={itemVariants}
              whileHover={{ y: -6 }}
            >
              <h3>Kết nối với chúng tôi</h3>

              <div className="social-grid">
                {socialItems.map((social, index) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`social-item ${social.accentClass}`}
                    whileHover={{
                      y: -6,
                      borderColor: social.color,
                    }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <div className="social-icon-wrap">
                      <social.icon />
                    </div>

                    <div className="social-content">
                      <strong>{social.name}</strong>
                      <span>{social.label}</span>
                      <small>{social.handle}</small>
                    </div>
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </motion.div>

          <motion.div className="form-column" variants={itemVariants}>
            <motion.div
              className="map-container glass-effect"
              whileHover={{ y: -4 }}
            >
              <div className="map-overlay" />
              <iframe
                title="Bản đồ Restaurantly"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.9005748413216!2d106.73379257485797!3d10.817150758386768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317527098834fe7d%3A0x814d72a39c8b60a!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBRdeG7kWMgdOG6vyBTw6BpIEfDsm4gU0lV!5e0!3m2!1svi!2s!4v1745606221035!5m2!1svi!2s"
                loading="lazy"
                allowFullScreen
              />
              <div className="map-badge">
                <FaMapMarkerAlt />
                <span>Nhà hàng Restaurantly</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
