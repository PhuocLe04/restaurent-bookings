'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, cubicBezier } from 'framer-motion'
import 'animate.css'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import './page.css'

type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

type BlogItem = {
  id: number
  title: string
  slug: string
  content: string
  short_description?: string | null
  thumbnail_url?: string | null
  status: BlogStatus | string
  published_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  users?: {
    id: number
    full_name: string
    email: string
  } | null
}

type DetailResponse = {
  item?: BlogItem
  message?: string
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
}

function formatDate(value?: string | null) {
  if (!value) return '--'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('vi-VN')
}

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Không thể đọc file ảnh'))
    }

    reader.onerror = () => reject(new Error('Đọc file thất bại'))
    reader.readAsDataURL(file)
  })
}

function statusClass(status: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PUBLISHED') return 'blog-badge published'
  if (s === 'DRAFT') return 'blog-badge draft'
  if (s === 'ARCHIVED') return 'blog-badge archived'
  return 'blog-badge'
}

function statusLabel(status: string) {
  const s = (status || '').toUpperCase()
  if (s === 'PUBLISHED') return 'Đã đăng'
  if (s === 'DRAFT') return 'Bản nháp'
  if (s === 'ARCHIVED') return 'Lưu trữ'
  return status || '--'
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: cubicBezier(0.22, 1, 0.36, 1) },
  },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: cubicBezier(0.22, 1, 0.36, 1) },
  },
}

const fadeRight = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: cubicBezier(0.22, 1, 0.36, 1) },
  },
}

const staggerWrap = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export default function BlogDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const id = useMemo(() => {
    const n = Number(params?.id)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }, [params?.id])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [item, setItem] = useState<BlogItem | null>(null)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [status, setStatus] = useState<BlogStatus>('DRAFT')

  const [thumbnailMode, setThumbnailMode] = useState<'url' | 'file'>('url')
  const [thumbnailFileName, setThumbnailFileName] = useState('')
  const [thumbnailLoading, setThumbnailLoading] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  function showToast(type: MessageType, message: string, title?: string) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
    }))
  }

  async function fetchDetail() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/admin/api/blogs/${id}`, {
        cache: 'no-store',
      })

      const data: DetailResponse = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải chi tiết blog')
      }

      const blog = data?.item
      if (!blog) {
        throw new Error('Không tìm thấy dữ liệu blog')
      }

      setItem(blog)
      setTitle(blog.title || '')
      setSlug(blog.slug || '')
      setContent(blog.content || '')
      setShortDescription(blog.short_description || '')
      setThumbnailUrl(blog.thumbnail_url || '')
      setStatus((blog.status as BlogStatus) || 'DRAFT')
      setThumbnailMode(
        blog.thumbnail_url?.startsWith('data:image') ? 'file' : 'url',
      )
      setThumbnailFileName('')
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi')
      setItem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('ID không hợp lệ')
      return
    }

    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleThumbnailFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      if (!isImageFile(file)) {
        throw new Error('Vui lòng chọn đúng file ảnh')
      }

      const maxSizeMb = 5
      if (file.size > maxSizeMb * 1024 * 1024) {
        throw new Error(`Ảnh không được vượt quá ${maxSizeMb}MB`)
      }

      setThumbnailLoading(true)

      const dataUrl = await readFileAsDataUrl(file)
      setThumbnailMode('file')
      setThumbnailFileName(file.name)
      setThumbnailUrl(dataUrl)

      showToast('success', 'Đã chọn ảnh từ máy thành công', 'Thumbnail')
    } catch (err: any) {
      showToast(
        'error',
        err?.message || 'Không thể đọc file ảnh',
        'Có lỗi xảy ra',
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setThumbnailLoading(false)
    }
  }

  function handleChangeThumbnailUrl(value: string) {
    setThumbnailMode('url')
    setThumbnailFileName('')
    setThumbnailUrl(value)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClearThumbnail() {
    setThumbnailUrl('')
    setThumbnailFileName('')
    setThumbnailMode('url')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim(),
        short_description: shortDescription.trim(),
        thumbnail_url: thumbnailUrl.trim(),
        status,
      }

      const res = await fetch(`/admin/api/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Cập nhật blog thất bại')
      }

      showToast(
        'success',
        'Blog đã được cập nhật thành công',
        'Cập nhật thành công',
      )

      await fetchDetail()
    } catch (err: any) {
      showToast(
        'error',
        err?.message || 'Cập nhật blog thất bại',
        'Có lỗi xảy ra',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)

      const res = await fetch(`/admin/api/blogs/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Xóa bài viết thất bại')
      }

      showToast('success', 'Bài viết đã được xóa thành công', 'Xóa thành công')
      setDeleteOpen(false)

      setTimeout(() => {
        router.push('/admin/blogs')
      }, 700)
    } catch (err: any) {
      showToast(
        'error',
        err?.message || 'Xóa bài viết thất bại',
        'Có lỗi xảy ra',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <motion.div
        className="admin-blog-detail"
        initial="hidden"
        animate="visible"
        variants={staggerWrap}
      >
        <motion.div className="blog-detail-page" variants={fadeUp}>
          <motion.div
            className="blog-detail-head animate__animated animate__fadeInDown"
            variants={fadeUp}
          >
            <div>
              <h1 className="blog-detail-title">Chi tiết bài viết</h1>
              <p className="blog-detail-subtitle">
                Xem, chỉnh sửa và quản lý nội dung bài viết
              </p>
            </div>

            <motion.div
              className="blog-detail-head-actions"
              variants={fadeUp}
              whileHover={{ scale: 1.01 }}
            >
              <Link href="/admin/blogs" className="blog-btn">
                ← Quay lại
              </Link>

              <motion.button
                type="button"
                className="blog-btn blog-btn-danger"
                onClick={() => setDeleteOpen(true)}
                disabled={loading || !item}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Xóa bài viết
              </motion.button>
            </motion.div>
          </motion.div>

          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                className="blog-error animate__animated animate__shakeX"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {loading ? (
            <motion.div
              className="blog-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="blog-empty animate__animated animate__pulse animate__infinite">
                Đang tải chi tiết bài viết...
              </div>
            </motion.div>
          ) : !item ? (
            <motion.div
              className="blog-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="blog-empty animate__animated animate__fadeIn">
                Không tìm thấy bài viết
              </div>
            </motion.div>
          ) : (
            <>
              <motion.div
                className="blog-card"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <motion.div className="blog-meta-grid" variants={staggerWrap}>
                  <motion.div className="blog-meta-item" variants={fadeUp}>
                    <span className="blog-meta-label">ID</span>
                    <strong>#{item.id}</strong>
                  </motion.div>

                  <motion.div className="blog-meta-item" variants={fadeUp}>
                    <span className="blog-meta-label">Tác giả</span>
                    <strong>{item.users?.full_name || '--'}</strong>
                    <span className="blog-meta-sub">
                      {item.users?.email || '--'}
                    </span>
                  </motion.div>

                  <motion.div className="blog-meta-item" variants={fadeUp}>
                    <span className="blog-meta-label">Trạng thái</span>
                    <motion.span
                      className={statusClass(status)}
                      key={status}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      {statusLabel(status)}
                    </motion.span>
                  </motion.div>

                  <motion.div className="blog-meta-item" variants={fadeUp}>
                    <span className="blog-meta-label">Ngày tạo</span>
                    <strong>{formatDate(item.created_at)}</strong>
                  </motion.div>

                  <motion.div className="blog-meta-item" variants={fadeUp}>
                    <span className="blog-meta-label">Ngày đăng</span>
                    <strong>{formatDate(item.published_at)}</strong>
                  </motion.div>
                </motion.div>
              </motion.div>

              <motion.form
                className="blog-detail-layout"
                onSubmit={handleSave}
                variants={staggerWrap}
                initial="hidden"
                animate="visible"
              >
                <motion.div className="blog-detail-main" variants={fadeLeft}>
                  <motion.div
                    className="blog-card animate__animated animate__fadeInLeft"
                    whileHover={{ y: -2 }}
                  >
                    <div className="blog-section-head">
                      <h3>Thông tin bài viết</h3>
                      <p>Chỉnh sửa tiêu đề, slug, mô tả và nội dung.</p>
                    </div>

                    <div className="blog-form-grid">
                      <motion.div className="blog-field" variants={fadeUp}>
                        <label>Tiêu đề</label>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Nhập tiêu đề blog"
                        />
                      </motion.div>

                      <motion.div className="blog-field" variants={fadeUp}>
                        <label>Slug</label>
                        <div className="blog-slug-row">
                          <input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="nhap-slug-bai-viet"
                          />
                          <motion.button
                            type="button"
                            className="blog-btn"
                            onClick={() => setSlug(toSlug(title))}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Tạo slug
                          </motion.button>
                        </div>
                      </motion.div>

                      <motion.div
                        className="blog-field blog-field-full"
                        variants={fadeUp}
                      >
                        <label>Mô tả ngắn</label>
                        <textarea
                          rows={4}
                          value={shortDescription}
                          onChange={(e) => setShortDescription(e.target.value)}
                          placeholder="Nhập mô tả ngắn cho bài viết"
                        />
                      </motion.div>

                      <motion.div
                        className="blog-field blog-field-full"
                        variants={fadeUp}
                      >
                        <label>Nội dung</label>
                        <textarea
                          rows={18}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Nhập nội dung blog"
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div className="blog-detail-side" variants={fadeRight}>
                  <motion.div
                    className="blog-card animate__animated animate__fadeInRight"
                    whileHover={{ y: -2 }}
                  >
                    <div className="blog-section-head">
                      <h3>Hiển thị & xuất bản</h3>
                      <p>Chọn trạng thái và cấu hình thumbnail.</p>
                    </div>

                    <motion.div className="blog-field" variants={fadeUp}>
                      <label>Trạng thái</label>

                      <div className="blog-select-wrap">
                        <select
                          value={status}
                          onChange={(e) =>
                            setStatus(e.target.value as BlogStatus)
                          }
                          className="blog-status-select"
                        >
                          <option value="DRAFT">Bản nháp</option>
                          <option value="PUBLISHED">Đã đăng</option>
                          <option value="ARCHIVED">Lưu trữ</option>
                        </select>

                        <span className="blog-select-arrow" aria-hidden="true">
                          ▼
                        </span>
                      </div>
                    </motion.div>

                    <motion.div className="blog-field" variants={fadeUp}>
                      <label>Thumbnail</label>

                      <div className="blog-thumb-tabs">
                        <motion.button
                          type="button"
                          className={`blog-thumb-tab ${
                            thumbnailMode === 'url' ? 'is-active' : ''
                          }`}
                          onClick={() => setThumbnailMode('url')}
                          whileTap={{ scale: 0.97 }}
                        >
                          Link ảnh
                        </motion.button>

                        <motion.button
                          type="button"
                          className={`blog-thumb-tab ${
                            thumbnailMode === 'file' ? 'is-active' : ''
                          }`}
                          onClick={() => setThumbnailMode('file')}
                          whileTap={{ scale: 0.97 }}
                        >
                          File ảnh
                        </motion.button>
                      </div>

                      <AnimatePresence mode="wait">
                        {thumbnailMode === 'url' && (
                          <motion.input
                            key="thumb-url"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            value={
                              thumbnailUrl.startsWith('data:image')
                                ? ''
                                : thumbnailUrl
                            }
                            onChange={(e) =>
                              handleChangeThumbnailUrl(e.target.value)
                            }
                            placeholder="https://example.com/image.jpg"
                          />
                        )}

                        {thumbnailMode === 'file' && (
                          <motion.div
                            key="thumb-file"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                          >
                            <motion.div
                              className="blog-upload-box"
                              onClick={() => fileInputRef.current?.click()}
                              role="button"
                              tabIndex={0}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  fileInputRef.current?.click()
                                }
                              }}
                            >
                              <div className="blog-upload-inner">
                                <div className="blog-upload-icon animate__animated animate__fadeIn">
                                  📷
                                </div>

                                {thumbnailFileName ? (
                                  <div className="blog-upload-text">
                                    <strong>{thumbnailFileName}</strong>
                                    <span>Click để chọn ảnh khác</span>
                                  </div>
                                ) : (
                                  <div className="blog-upload-text">
                                    <strong>
                                      {thumbnailLoading
                                        ? 'Đang xử lý ảnh...'
                                        : 'Chọn ảnh từ máy'}
                                    </strong>
                                    <span>PNG, JPG, WEBP tối đa 5MB</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="blog-hidden-file-input"
                              onChange={handleThumbnailFileChange}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="blog-thumb-helper">
                        {thumbnailMode === 'url'
                          ? 'Dán link ảnh trực tiếp để dùng làm thumbnail.'
                          : thumbnailFileName
                            ? `Đã chọn file: ${thumbnailFileName}`
                            : 'Click vào khung bên trên để chọn file ảnh từ máy.'}
                      </div>

                      {thumbnailUrl ? (
                        <motion.button
                          type="button"
                          className="blog-btn"
                          onClick={handleClearThumbnail}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Xóa ảnh
                        </motion.button>
                      ) : null}
                    </motion.div>

                    <motion.div
                      className="blog-preview-box"
                      variants={fadeUp}
                      layout
                    >
                      <AnimatePresence mode="wait">
                        {thumbnailUrl ? (
                          <motion.img
                            key={thumbnailUrl}
                            src={thumbnailUrl}
                            alt={title || 'thumbnail'}
                            className="blog-preview-image"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.28 }}
                          />
                        ) : (
                          <motion.div
                            key="empty-thumb"
                            className="blog-preview-placeholder animate__animated animate__fadeIn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <div className="blog-preview-placeholder-icon">
                              🖼️
                            </div>
                            <div>Chưa có ảnh thumbnail</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    <motion.div className="blog-action-stack" variants={fadeUp}>
                      <motion.button
                        type="submit"
                        className="blog-btn blog-btn-primary"
                        disabled={saving || thumbnailLoading}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                      </motion.button>

                      <motion.button
                        type="button"
                        className="blog-btn"
                        onClick={fetchDetail}
                        disabled={saving || thumbnailLoading}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Tải lại dữ liệu
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.form>
            </>
          )}
        </motion.div>
      </motion.div>

      <DeleteConfirmModal
        open={deleteOpen}
        title="Xác nhận xóa blog"
        message="Bạn có chắc muốn xóa bài viết này không? Hành động này không thể hoàn tác."
        itemName={item?.title}
        loading={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={handleDelete}
      />

      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        autoClose={4000}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
      />
    </>
  )
}
