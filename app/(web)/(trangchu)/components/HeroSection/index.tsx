'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import 'animate.css'
import './index.css'

export default function HeroSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false)

  return (
    <>
      <section id="hero" className="hero section">
        <div className="hero-background">
          <img src="/img/hero-bg.jpg" alt="Ảnh nền nhà hàng" />
          <div className="overlay" />
        </div>

        <div className="container">
          <div className="row">
            <motion.div
              className="col-lg-8 d-flex flex-column align-items-center align-items-lg-start"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <motion.h2 className="animate__animated animate__fadeInUp">
                Chào mừng đến với <span>Restaurantly</span>
              </motion.h2>

              <motion.p className="animate__animated animate__fadeInUp animate__delay-1s">
                Mang đến những món ăn tuyệt vời!
              </motion.p>

              <motion.div
                className="d-flex mt-4 gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <motion.a
                  href="/menu"
                  className="cta-btn"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Thực đơn
                </motion.a>

                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href="/reservations" className="cta-btn">
                    Đặt bàn
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              className="col-lg-4 d-flex align-items-center justify-content-center mt-5 mt-lg-0"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <motion.button
                className="pulsating-play-btn"
                aria-label="Phát video"
                onClick={() => setIsVideoOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(255, 215, 0, 0.7)',
                    '0 0 0 20px rgba(255, 215, 0, 0)',
                    '0 0 0 0 rgba(255, 215, 0, 0)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            className="video-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVideoOpen(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                className="modal-close"
                onClick={() => setIsVideoOpen(false)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>

              <div className="video-wrapper">
                <iframe
                  src="https://www.youtube.com/embed/teEwaAgehvY?autoplay=1"
                  title="Video nhà hàng"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
