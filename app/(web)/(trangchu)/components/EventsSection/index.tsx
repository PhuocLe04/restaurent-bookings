'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './index.css'

type Combo = {
  id: number
  title: string
  description?: string | null
  total_origin_price: number
  sale_price: number
  discount_percent: number
  services?: { name: string; image: string | null; quantity?: number | null }[]
  menu_items?: { name: string }[]
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫'
}

function isAbsoluteUrl(s?: string | null) {
  if (!s) return false
  return /^https?:\/\//i.test(s)
}

// Nếu bạn có CDN/host riêng cho ảnh upload, set env này:
// NEXT_PUBLIC_ASSET_BASE_URL=https://your-domain.com
const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL || ''

function normalizeImageSrc(img?: string | null) {
  if (!img) return '/img/event-placeholder.jpg'

  // ✅ Link full: https://...
  if (isAbsoluteUrl(img)) return img

  // ✅ Path bắt đầu bằng "/" (public): /uploads/a.jpg
  if (img.startsWith('/')) return img

  // ✅ Path không có "/" đầu: uploads/a.jpg => /uploads/a.jpg (hoặc prefix CDN)
  const path = `/${img}`
  return ASSET_BASE_URL ? `${ASSET_BASE_URL}${path}` : path
}

// ✅ lấy ảnh từ service (ưu tiên service đầu tiên có image)
function getComboImage(combo: Combo) {
  const img = combo.services?.find((s) => s.image)?.image
  return normalizeImageSrc(img)
}

export default function EventsSection() {
  const [combos, setCombos] = useState<Combo[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [loading, setLoading] = useState(true)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ✅ fetch combos từ route
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/event-list?active=true', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to fetch combos')
        const data: { combos: Combo[] } = await res.json()
        if (!alive) return
        setCombos(data.combos ?? [])
        setActiveIndex(0)
      } catch (e) {
        console.error(e)
        if (!alive) return
        setCombos([])
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // autoplay
  useEffect(() => {
    if (!autoplay) return
    if (combos.length <= 1) return

    timeoutRef.current = setTimeout(() => {
      setDirection(1)
      setActiveIndex((prev) => (prev + 1) % combos.length)
    }, 5000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [activeIndex, autoplay, combos.length])

  const handlePrev = () => {
    if (combos.length === 0) return
    setAutoplay(false)
    setDirection(-1)
    setActiveIndex((prev) => (prev - 1 + combos.length) % combos.length)
  }

  const handleNext = () => {
    if (combos.length === 0) return
    setAutoplay(false)
    setDirection(1)
    setActiveIndex((prev) => (prev + 1) % combos.length)
  }

  const handleDotClick = (index: number) => {
    setAutoplay(false)
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  const current = combos[activeIndex]

  return (
    <section id="events" className="events-section">
      {/* Background with overlay */}
      <div className="events-background">
        <img
          src="/img/events-bg.jpg"
          alt="Events background"
          className="bg-image"
        />
        <div className="bg-overlay"></div>
      </div>

      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <motion.span
            className="section-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            Combos
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT_EXPO }}
          >
            Save More With Our Combos
          </motion.h2>

          <motion.div
            className="divider"
            initial={{ width: 0 }}
            whileInView={{ width: 80 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT_EXPO }}
          />
        </div>

        {/* Slider */}
        <div className="slider-container">
          {loading ? (
            <div className="event-slide">
              <div className="event-content">
                <div className="event-image-wrapper skeleton-box" />
                <div className="event-details">
                  <div className="skeleton-line w60" />
                  <div className="skeleton-line w40" />
                  <div className="skeleton-line w80" />
                  <div className="skeleton-line w70" />
                </div>
              </div>
            </div>
          ) : combos.length === 0 ? (
            <div className="event-slide">
              <div className="event-content">
                <div className="event-details">
                  <h3 className="event-title">No combo available</h3>
                  <p className="event-description">Please check back later.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.35 },
                  }}
                  className="event-slide"
                >
                  <div className="event-content">
                    {/* ✅ ảnh lấy từ service (hỗ trợ cả link và file path) */}
                    <div className="event-image-wrapper">
                      <img
                        src={getComboImage(current)}
                        alt={current.title}
                        className="event-image"
                      />
                      <div className="image-overlay"></div>

                      {/* Badge trên ảnh (giữ lại) */}
                      <div className="discount-badge">
                        -{current.discount_percent}%
                      </div>
                    </div>

                    <div className="event-details">
                      <h3 className="event-title">{current.title}</h3>

                      {/* ✅ GIÁ: sale nổi bật + giá gốc nhỏ + pill % giảm */}
                      <div className="price-row">
                        <div className="price-col">
                          <span className="price-new">
                            {formatVND(current.sale_price)} / 1 BÀN
                          </span>

                          <div className="price-sub">
                            <span className="price-old">
                              {formatVND(current.total_origin_price)}
                            </span>

                            <span className="discount-pill">
                              -{current.discount_percent}%
                            </span>
                          </div>

                          {/* Optional: Tiết kiệm bao nhiêu */}
                          <span className="save-amount">
                            Tiết kiệm{' '}
                            {formatVND(
                              Math.max(
                                0,
                                current.total_origin_price - current.sale_price,
                              ),
                            )}
                          </span>
                        </div>
                      </div>

                      {/* ✅ chỉ list tên món trong combo */}
                      {current.menu_items?.length ? (
                        <ul className="features-list">
                          {current.menu_items.slice(0, 6).map((m, idx) => (
                            <motion.li
                              key={`${current.id}-${idx}`}
                              initial={{ opacity: 0, x: -14 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.15 + idx * 0.06 }}
                            >
                              <i className="bi bi-dot"></i>
                              <span>{m.name}</span>
                            </motion.li>
                          ))}
                        </ul>
                      ) : (
                        <p className="event-description">
                          Save {current.discount_percent}% with this combo.
                        </p>
                      )}

                      <motion.button
                        className="book-now-btn"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        Choose this combo <i className="bi bi-arrow-right"></i>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <button
                className="nav-btn prev-btn"
                onClick={handlePrev}
                aria-label="Previous combo"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                className="nav-btn next-btn"
                onClick={handleNext}
                aria-label="Next combo"
              >
                <i className="bi bi-chevron-right"></i>
              </button>

              {/* Dots */}
              <div className="dots-container">
                {combos.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${index === activeIndex ? 'active' : ''}`}
                    onClick={() => handleDotClick(index)}
                    aria-label={`Go to combo ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
