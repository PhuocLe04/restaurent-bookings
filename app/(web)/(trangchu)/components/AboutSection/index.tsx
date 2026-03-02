'use client'

import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { FaCheckCircle, FaStar, FaHandshake } from 'react-icons/fa'

export default function AboutSection() {
  // =====================
  // Variants (typed)
  // =====================

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: {
      y: 30,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 15,
      },
    },
  }

  const imageVariants: Variants = {
    hidden: {
      scale: 0.9,
      opacity: 0,
      x: -50,
    },
    visible: {
      scale: 1,
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 60,
        damping: 20,
        delay: 0.3,
      },
    },
  }

  // =====================
  // Data
  // =====================

  const features = [
    {
      icon: <FaCheckCircle />,
      title: 'Customized Solutions',
      description:
        'We provide customized solutions to meet your specific needs.',
    },
    {
      icon: <FaCheckCircle />,
      title: 'Timely & Effective',
      description:
        'Our team ensures timely and effective delivery of all projects.',
    },
    {
      icon: <FaCheckCircle />,
      title: 'Exceed Expectations',
      description:
        'We strive to exceed expectations with attention to every detail.',
    },
    {
      icon: <FaHandshake />,
      title: 'Client Partnership',
      description:
        'Your satisfaction is our priority - we work closely with you.',
    },
  ]

  const stats = [
    {
      value: '8+',
      label: 'Years Experience',
    },
    {
      value: '1000+',
      label: 'Projects Delivered',
    },
    {
      value: '98%',
      label: 'Client Satisfaction',
    },
    {
      value: '50+',
      label: 'Team Members',
    },
  ]

  return (
    <section id="about" className="about-section">
      {/* Background decorative elements */}
      <div className="background-pattern"></div>

      <div className="container">
        <div className="about-content">
          {/* Image Section */}
          <motion.div
            className="about-image-wrapper"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={imageVariants}
          >
            <div className="image-frame">
              <img
                src="/img/about.jpg"
                alt="Professional team at work"
                className="about-image"
              />
              <div className="image-badge">
                <FaStar className="badge-icon" />
                <span>Since 2015</span>
              </div>
            </div>
          </motion.div>

          {/* Content Section */}
          <motion.div
            className="about-details"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div variants={itemVariants}>
              <h3 className="content-title">
                Professional and{' '}
                <span className="highlight-text">Reliable Services</span>
              </h3>

              <motion.p
                variants={itemVariants}
                className="content-description italic"
              >
                We are committed to delivering high-quality services with
                professionalism and integrity, ensuring customer satisfaction at
                every step.
              </motion.p>
            </motion.div>

            {/* Features Grid */}
            <motion.div variants={itemVariants} className="features-grid">
              {features.slice(0, 3).map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="feature-item"
                  whileHover={{
                    y: -5,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon-background"></div>
                    <div className="feature-icon">{feature.icon}</div>
                  </div>
                  <div className="feature-content">
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.p variants={itemVariants} className="main-content">
              Your satisfaction is our priority. We work closely with you to
              ensure every project is completed to the highest standard.
            </motion.p>

            {/* Additional Feature */}
            <motion.div variants={itemVariants} className="additional-feature">
              <div className="additional-icon">
                <FaHandshake />
              </div>
              <div>
                <h4>Client-Centric Approach</h4>
                <p>
                  We build lasting relationships based on trust, transparency,
                  and mutual success.
                </p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="stats-container"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className="stat-item"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
