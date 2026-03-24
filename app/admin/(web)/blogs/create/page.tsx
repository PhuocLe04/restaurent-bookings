'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import './page.css'

type BlogStatus = 'DRAFT' | 'PUBLISHED'

type CreateResponse = {
  message?: string
  item?: {
    id: number
    title: string
    slug: string
  }
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
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

const pageTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as const,
}

export default function CreateBlogPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [saving, setSaving] = useState(false)
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

  function handleResetForm() {
    setTitle('')
    setSlug('')
    setContent('')
    setShortDescription('')
    setThumbnailUrl('')
    setThumbnailFileName('')
    setThumbnailMode('url')
    setStatus('DRAFT')
    if (fileInputRef.current) fileInputRef.current.value = ''
    showToast('info', 'Đã xóa toàn bộ nội dung form', 'Làm mới biểu mẫu')
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
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

      const res = await fetch('/admin/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: CreateResponse = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.message || 'Tạo blog thất bại')
      }

      showToast('success', 'Blog đã được tạo thành công', 'Tạo thành công')

      const newId = data?.item?.id
      window.setTimeout(() => {
        if (newId) router.push(`/admin/blogs/${newId}`)
        else router.push('/admin/blogs')
      }, 700)
    } catch (err: any) {
      showToast('error', err?.message || 'Tạo blog thất bại', 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div
        className="admin-blog-create"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        <div className="blog-create-page">
          <motion.div
            className="blog-create-head"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...pageTransition, delay: 0.05 }}
          >
            <div>
              <h1 className="blog-create-title">Tạo bài viết mới</h1>
              <p className="blog-create-subtitle">
                Tạo mới bài viết và cấu hình nội dung hiển thị
              </p>
            </div>

            <div className="blog-create-head-actions">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link href="/admin/blogs" className="blog-btn">
                  ← Quay lại
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <form className="blog-create-layout" onSubmit={handleCreate}>
            <motion.div
              className="blog-create-main"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...pageTransition, delay: 0.08 }}
            >
              <div className="blog-card">
                <div className="blog-section-head">
                  <h3>Thông tin bài viết</h3>
                  <p>Nhập tiêu đề, slug, mô tả và nội dung bài viết.</p>
                </div>

                <div className="blog-form-grid">
                  <div className="blog-field">
                    <label>Tiêu đề</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Nhập tiêu đề blog"
                    />
                  </div>

                  <div className="blog-field">
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
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSlug(toSlug(title))}
                      >
                        Tạo slug
                      </motion.button>
                    </div>
                  </div>

                  <div className="blog-field blog-field-full">
                    <label>Mô tả ngắn</label>
                    <textarea
                      rows={4}
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="Nhập mô tả ngắn cho bài viết"
                    />
                  </div>

                  <div className="blog-field blog-field-full">
                    <label>Nội dung</label>
                    <textarea
                      rows={18}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Nhập nội dung blog"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="blog-create-side"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...pageTransition, delay: 0.12 }}
            >
              <div className="blog-card">
                <div className="blog-section-head">
                  <h3>Hiển thị & xuất bản</h3>
                  <p>Chọn trạng thái và cấu hình thumbnail.</p>
                </div>

                <div className="blog-field">
                  <label>Trạng thái</label>
                  <div className="blog-select-wrap">
                    <select
                      className="blog-status-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as BlogStatus)}
                    >
                      <option value="DRAFT">Bản nháp</option>
                      <option value="PUBLISHED">Đăng ngay</option>
                    </select>
                    <span className="blog-select-arrow">▾</span>
                  </div>
                </div>

                <div className="blog-field">
                  <label>Thumbnail</label>

                  <div className="blog-thumb-tabs">
                    <button
                      type="button"
                      className={`blog-thumb-tab ${
                        thumbnailMode === 'url' ? 'is-active' : ''
                      }`}
                      onClick={() => setThumbnailMode('url')}
                    >
                      Link ảnh
                    </button>

                    <button
                      type="button"
                      className={`blog-thumb-tab ${
                        thumbnailMode === 'file' ? 'is-active' : ''
                      }`}
                      onClick={() => setThumbnailMode('file')}
                    >
                      File ảnh
                    </button>
                  </div>

                  {thumbnailMode === 'url' ? (
                    <motion.div
                      key="thumb-url"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
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
                    </motion.div>
                  ) : (
                    <motion.div
                      key="thumb-file"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="blog-upload-box"
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            fileInputRef.current?.click()
                          }
                        }}
                      >
                        <div className="blog-upload-inner">
                          <motion.div
                            className="blog-upload-icon"
                            animate={
                              thumbnailLoading
                                ? { scale: [1, 1.08, 1] }
                                : { scale: 1 }
                            }
                            transition={
                              thumbnailLoading
                                ? {
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }
                                : { duration: 0.2 }
                            }
                          >
                            📷
                          </motion.div>

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
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="blog-hidden-file-input"
                        onChange={handleThumbnailFileChange}
                      />
                    </motion.div>
                  )}

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
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClearThumbnail}
                    >
                      Xóa ảnh
                    </motion.button>
                  ) : null}
                </div>

                <div className="blog-preview-box">
                  {thumbnailUrl ? (
                    <motion.img
                      key={thumbnailUrl}
                      src={thumbnailUrl}
                      alt={title || 'thumbnail'}
                      className="blog-preview-image"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                    />
                  ) : (
                    <div className="blog-preview-placeholder">
                      <div className="blog-preview-placeholder-icon">🖼️</div>
                      <div>Chưa có ảnh thumbnail</div>
                    </div>
                  )}
                </div>

                <div className="blog-action-stack">
                  <motion.button
                    type="submit"
                    className="blog-btn blog-btn-primary"
                    disabled={saving || thumbnailLoading}
                    whileHover={
                      saving || thumbnailLoading ? undefined : { y: -2 }
                    }
                    whileTap={
                      saving || thumbnailLoading ? undefined : { scale: 0.98 }
                    }
                  >
                    {saving ? 'Đang tạo...' : 'Tạo bài viết'}
                  </motion.button>

                  <motion.button
                    type="button"
                    className="blog-btn"
                    onClick={handleResetForm}
                    disabled={saving || thumbnailLoading}
                    whileHover={
                      saving || thumbnailLoading ? undefined : { y: -2 }
                    }
                    whileTap={
                      saving || thumbnailLoading ? undefined : { scale: 0.98 }
                    }
                  >
                    Xóa nội dung
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </form>
        </div>
      </motion.div>

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
