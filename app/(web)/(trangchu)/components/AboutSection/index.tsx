'use client'

import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { FaUtensils, FaWineGlassAlt, FaClock } from 'react-icons/fa'
import 'animate.css'
import './index.css'

export default function AboutSection() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: 14, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 90, damping: 16 },
    },
  }

  const imageVariants: Variants = {
    hidden: { scale: 0.95, opacity: 0, x: -20 },
    visible: {
      scale: 1,
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 70, damping: 18, delay: 0.15 },
    },
  }

  const features = [
    {
      icon: <FaUtensils />,
      title: 'Ẩm thực tinh tế',
      description: 'Thực đơn chọn lọc theo mùa, trình bày chỉn chu.',
    },
    {
      icon: <FaWineGlassAlt />,
      title: 'Rượu vang cao cấp',
      description: 'Kết hợp hương vị chuẩn gu cho từng món.',
    },
    {
      icon: <FaClock />,
      title: 'Phục vụ linh hoạt',
      description: 'Đặt bàn nhanh, hỗ trợ theo khung giờ của bạn.',
    },
  ]

  return (
    <section id="about" className="about-section about-compact">
      <div className="about-background">
        <div className="pattern-overlay" />
      </div>

      <div className="container">
        <motion.div
          className="section-header compact"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <h5 className="section-subtitle">VỀ CHÚNG TÔI</h5>
          <h2 className="section-title">
            Một trải nghiệm <span className="highlight">đủ tinh tế</span> để nhớ
          </h2>
        </motion.div>

        <div className="about-content-wrapper compact">
          <div className="about-content compact">
            <motion.div
              className="about-image-wrapper compact"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={imageVariants}
            >
              <div className="image-frame compact">
                <img
                  src="/img/about.jpg"
                  alt="Nhà hàng Restaurantly"
                  className="about-image"
                />
              </div>
            </motion.div>

            <motion.div
              className="about-details compact"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
            >
              <motion.h3
                variants={itemVariants}
                className="content-title compact"
              >
                Chạm vào{' '}
                <span className="highlight-text">hương vị đích thực</span>
              </motion.h3>

              <motion.p
                variants={itemVariants}
                className="content-description compact"
              >
                Restaurantly kết hợp tinh hoa ẩm thực Việt cùng phong cách phục
                vụ hiện đại — gọn gàng, ấm cúng và chỉn chu trong từng chi tiết.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="features-grid compact"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="feature-card compact"
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  >
                    <div className="feature-icon">{feature.icon}</div>
                    <div className="feature-content">
                      <h4>{feature.title}</h4>
                      <p>{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
