'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import 'animate.css'
import '../page.css'

export type BlogListItem = {
  id: number
  title: string
  slug: string
  short_description: string | null
  thumbnail_url: string | null
  published_at: string | null
  author: { id: number; full_name: string; avatar: string | null } | null
}

export type BlogsResponse = {
  page: number
  limit: number
  total: number
  totalPages: number
  data: BlogListItem[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 90,
      damping: 14,
    },
  },
  hover: {
    y: -8,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 18,
    },
  },
}

function fmtDate(iso?: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(new Date(iso))
}

function truncateWords(text: string | null | undefined, maxWords = 24) {
  if (!text) return '—'

  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text

  return words.slice(0, maxWords).join(' ') + '...'
}

export function SearchForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(defaultValue)
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)

    const params = new URLSearchParams(searchParams)
    const keyword = searchValue.trim()

    if (keyword) {
      params.set('q', keyword)
    } else {
      params.delete('q')
    }

    params.set('page', '1')
    router.push(`/blogs?${params.toString()}`)

    setTimeout(() => setIsSearching(false), 500)
  }

  const handleClear = () => {
    setSearchValue('')
    const params = new URLSearchParams(searchParams)
    params.delete('q')
    params.set('page', '1')
    router.push(`/blogs?${params.toString()}`)
  }

  return (
    <motion.form
      className="blogs-search-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="search-wrapper">
        <motion.span
          className="search-icon"
          animate={{ rotate: isSearching ? 360 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <i className="bi bi-search" />
        </motion.span>

        <motion.input
          type="text"
          name="q"
          className="search-input"
          placeholder="Tìm kiếm bài viết..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          whileFocus={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 280 }}
        />

        <AnimatePresence>
          {searchValue && (
            <motion.button
              type="button"
              className="search-clear"
              onClick={handleClear}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              aria-label="Xóa tìm kiếm"
            >
              <i className="bi bi-x-lg" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="submit"
        className="search-submit"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
      </motion.button>
    </motion.form>
  )
}

export function BlogCard({
  blog,
  index,
}: {
  blog: BlogListItem
  index: number
}) {
  return (
    <motion.article
      className="blog-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      layout
    >
      <Link href={`/blogs/${blog.slug}`} className="blog-card-link">
        <div className="blog-card-image-wrapper">
          {blog.thumbnail_url ? (
            <motion.img
              src={blog.thumbnail_url}
              alt={blog.title}
              className="blog-card-image"
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.45 }}
            />
          ) : (
            <div className="blog-image-placeholder">
              <i className="bi bi-image" />
            </div>
          )}

          <motion.div
            className="blog-card-overlay"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <span className="read-more">
              Đọc tiếp <i className="bi bi-arrow-right" />
            </span>
          </motion.div>
        </div>

        <div className="blog-card-content">
          <div className="blog-card-body">
            <motion.h3
              className="blog-card-title"
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 280 }}
            >
              {blog.title}
            </motion.h3>

            <motion.p
              className="blog-card-description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12 + index * 0.04 }}
            >
              {truncateWords(blog.short_description, 24)}
            </motion.p>
          </div>

          <div className="blog-card-meta blog-card-meta-bottom">
            <div className="blog-meta-item">
              <i className="bi bi-calendar3" />
              <span>{fmtDate(blog.published_at)}</span>
            </div>

            <div className="blog-meta-item">
              <i className="bi bi-person" />
              <span>{blog.author?.full_name ?? '—'}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

export function Pagination({
  page,
  totalPages,
  q,
}: {
  page: number
  totalPages: number
  q?: string
}) {
  const router = useRouter()

  const mkHref = (p: number) => {
    const sp = new URLSearchParams()
    sp.set('page', String(p))
    if (q) sp.set('q', q)
    return `/blogs?${sp.toString()}`
  }

  const prev = Math.max(1, page - 1)
  const next = Math.min(totalPages, page + 1)

  const pages: number[] = []
  let lastAdded: number | null = null

  for (let i = 1; i <= totalPages; i++) {
    const shouldShow =
      i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)

    if (shouldShow) {
      pages.push(i)
      lastAdded = i
    } else if (lastAdded !== -1) {
      pages.push(-1)
      lastAdded = -1
    }
  }

  return (
    <nav className="blogs-pagination" aria-label="Phân trang blog">
      <motion.ul
        className="pagination-list"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.li variants={itemVariants}>
          <motion.button
            type="button"
            className={`pagination-prev ${page <= 1 ? 'disabled' : ''}`}
            onClick={() => page > 1 && router.push(mkHref(prev))}
            disabled={page <= 1}
            whileHover={page > 1 ? { x: -4 } : {}}
            whileTap={page > 1 ? { scale: 0.96 } : {}}
          >
            <i className="bi bi-chevron-left" />
            <span>Trước</span>
          </motion.button>
        </motion.li>

        {pages.map((p, idx) => (
          <motion.li key={`${p}-${idx}`} variants={itemVariants}>
            {p === -1 ? (
              <span className="pagination-dots">...</span>
            ) : (
              <motion.button
                type="button"
                className={`pagination-number ${p === page ? 'active' : ''}`}
                onClick={() => router.push(mkHref(p))}
                whileHover={p !== page ? { scale: 1.06 } : {}}
                whileTap={{ scale: 0.96 }}
              >
                {p}
              </motion.button>
            )}
          </motion.li>
        ))}

        <motion.li variants={itemVariants}>
          <motion.button
            type="button"
            className={`pagination-next ${page >= totalPages ? 'disabled' : ''}`}
            onClick={() => page < totalPages && router.push(mkHref(next))}
            disabled={page >= totalPages}
            whileHover={page < totalPages ? { x: 4 } : {}}
            whileTap={page < totalPages ? { scale: 0.96 } : {}}
          >
            <span>Sau</span>
            <i className="bi bi-chevron-right" />
          </motion.button>
        </motion.li>
      </motion.ul>
    </nav>
  )
}
