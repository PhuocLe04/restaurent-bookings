'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './index.css'

type Category = { id: number; name: string }

type MenuItem = {
  id: number
  name: string
  price: number
  image: string | null
  category_id: number
  category: { id: number; name: string }
  total_sold: number
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 320, damping: 24 },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.15 } },
}

function SkeletonCard({ i }: { i: number }) {
  return (
    <motion.div
      className="col-lg-6"
      variants={itemVariants}
      custom={i}
      aria-hidden
    >
      <div className="rb-card rb-skeleton">
        <div className="rb-skelAvatar" />
        <div className="rb-skelBody">
          <div className="rb-skelLine rb-w70" />
          <div className="rb-skelLine rb-w40" />
          <div className="rb-skelMeta" />
        </div>
      </div>
    </motion.div>
  )
}

export default function MenuSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [topItems, setTopItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/menu', { cache: 'no-store' })
        const data: { categories: Category[] } = await res.json()
        if (!alive) return
        setCategories(data.categories ?? [])
      } catch (e) {
        console.error(e)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const qs =
          activeCategory === 'all'
            ? ''
            : `?categoryId=${encodeURIComponent(String(activeCategory))}`

        const res = await fetch(`/api/menu/featured-menu${qs}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to fetch featured menu')
        const data: { items: MenuItem[] } = await res.json()
        if (!alive) return
        setTopItems(data.items ?? [])
      } catch (e) {
        console.error(e)
        if (!alive) return
        setTopItems([])
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [activeCategory])

  const formatPrice = (price: number) => price.toLocaleString('vi-VN') + ' ₫'
  const imageSrc = (img: string | null) => img || '/img/menu-placeholder.png'

  const pills = useMemo(
    () => [{ id: 'all' as const, name: 'Tất cả' }, ...categories],
    [categories],
  )

  return (
    <section id="menu" className="menu section">
      <div className="rb-decor rb-decor1" />
      <div className="rb-decor rb-decor2" />

      <div className="container section-title">
        <motion.h2
          initial={{ opacity: 0, y: -14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          Thực đơn
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: -14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE_OUT_EXPO }}
        >
          Món ăn được yêu thích
        </motion.p>

        <motion.div
          className="rb-titleLine"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.16, ease: EASE_OUT_EXPO }}
        />
      </div>

      <div className="container">
        {/* filters */}
        <div className="row">
          <div className="col-lg-12 d-flex justify-content-center">
            <div className="rb-filtersWrap">
              <ul className="rb-filters" aria-label="Bộ lọc thực đơn">
                {pills.map((c) => {
                  const id = typeof c.id === 'number' ? c.id : 'all'
                  const active = activeCategory === id
                  return (
                    <li key={String(c.id)}>
                      <button
                        type="button"
                        className={`rb-pill ${active ? 'is-active' : ''}`}
                        onClick={() => setActiveCategory(id)}
                        aria-pressed={active}
                      >
                        {c.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={String(activeCategory)}
            className="row g-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {loading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} i={i} />
                ))}
              </>
            ) : topItems.length === 0 ? (
              <motion.div className="col-12" variants={itemVariants}>
                <div className="rb-empty">
                  <div className="rb-emptyIcon">😕</div>
                  <div className="rb-emptyTitle">Không tìm thấy món</div>
                  <div className="rb-emptyDesc">
                    Hãy thử danh mục khác hoặc quay lại sau.
                  </div>
                </div>
              </motion.div>
            ) : (
              topItems.map((item) => (
                <motion.div
                  key={item.id}
                  className="col-lg-6"
                  variants={itemVariants}
                >
                  <motion.div
                    className="rb-card"
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                  >
                    <div className="rb-avatar">
                      <img
                        src={imageSrc(item.image)}
                        alt={item.name}
                        loading="lazy"
                      />
                      <div className="rb-badge" title="Tổng số đã bán">
                        🔥 {item.total_sold}
                      </div>
                    </div>

                    <div className="rb-body">
                      <div className="rb-top">
                        <div className="rb-name" title={item.name}>
                          {item.name}
                        </div>
                        <div className="rb-price">
                          {formatPrice(item.price)}
                        </div>
                      </div>

                      <div className="rb-meta">
                        <span className="rb-tag">{item.category.name}</span>
                      </div>

                      <div className="rb-actions">
                        <Link
                          className="rb-link"
                          href={`/menu?item=${item.id}`}
                        >
                          Xem chi tiết <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>

                    <div className="rb-glow" aria-hidden />
                  </motion.div>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* see more */}
        <motion.div
          className="row mt-5"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <div className="col-lg-12 d-flex justify-content-center">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <Link href="/menu" className="btn-book-a-table rb-cta-book">
                <span>Xem thêm thực đơn</span>
                <span aria-hidden>→</span>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
