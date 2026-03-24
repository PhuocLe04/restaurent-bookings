'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import './page.css'

type CreateResponse = {
  message?: string
  item?: {
    id: number
    name: string
    image?: string | null
    description?: string | null
    price: string | number
    is_active: boolean
  }
}

type ToastState = {
  visible: boolean
  type: MessageType
  title?: string
  message: string
  key: number
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('vi-VN')
}

function parsePriceToNumber(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : NaN
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

export default function CreateServicePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [imageMode, setImageMode] = useState<'url' | 'file'>('url')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageFileName, setImageFileName] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [imageLoading, setImageLoading] = useState(false)

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

  async function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
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

      setImageLoading(true)

      const dataUrl = await readFileAsDataUrl(file)

      setImageMode('file')
      setImageFile(file)
      setImageFileName(file.name)
      setImagePreview(dataUrl)
      setImageUrl('')

      showToast('success', 'Đã chọn ảnh dịch vụ từ máy thành công', 'Hình ảnh')
    } catch (err: any) {
      showToast(
        'error',
        err?.message || 'Không thể đọc file ảnh',
        'Có lỗi xảy ra',
      )
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setImageLoading(false)
    }
  }

  function handleChangeImageUrl(value: string) {
    setImageMode('url')
    setImageUrl(value)
    setImageFile(null)
    setImageFileName('')
    setImagePreview(value.trim())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClearImage() {
    setImageUrl('')
    setImageFile(null)
    setImageFileName('')
    setImagePreview('')
    setImageMode('url')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleResetForm() {
    setName('')
    setDescription('')
    setPrice('')
    setIsActive(true)
    setImageMode('url')
    setImageUrl('')
    setImageFile(null)
    setImageFileName('')
    setImagePreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''

    showToast('info', 'Đã xóa toàn bộ nội dung form', 'Làm mới biểu mẫu')
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      setSaving(true)

      const numericPrice = parsePriceToNumber(price)

      if (!name.trim()) {
        throw new Error('Tên dịch vụ là bắt buộc')
      }

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        throw new Error('Giá dịch vụ không hợp lệ')
      }

      let res: Response

      if (imageMode === 'file' && imageFile) {
        const formData = new FormData()
        formData.append('name', name.trim())
        formData.append('description', description.trim())
        formData.append('price', String(numericPrice))
        formData.append('is_active', String(isActive))
        formData.append('image_file', imageFile)

        res = await fetch('/admin/api/reservation-services', {
          method: 'POST',
          body: formData,
        })
      } else {
        const payload = {
          name: name.trim(),
          description: description.trim(),
          price: numericPrice,
          is_active: isActive,
          image: imageUrl.trim(),
        }

        res = await fetch('/admin/api/reservation-services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }

      const data: CreateResponse = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.message || 'Tạo dịch vụ thất bại')
      }

      showToast('success', 'Dịch vụ đã được tạo thành công', 'Tạo thành công')

      const newId = data?.item?.id
      window.setTimeout(() => {
        if (newId) router.push(`/admin/reservation-services/${newId}`)
        else router.push('/admin/reservation-services')
      }, 700)
    } catch (err: any) {
      showToast(
        'error',
        err?.message || 'Tạo dịch vụ thất bại',
        'Có lỗi xảy ra',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div
        className="admin-service-create"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        <div className="service-create-page">
          <motion.div
            className="service-create-head"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...pageTransition, delay: 0.05 }}
          >
            <div>
              <h1 className="service-create-title">Tạo dịch vụ mới</h1>
              <p className="service-create-subtitle">
                Tạo mới dịch vụ và cấu hình thông tin hiển thị
              </p>
            </div>

            <div className="service-create-head-actions">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/admin/reservation-services"
                  className="service-btn"
                >
                  ← Quay lại
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <form className="service-create-layout" onSubmit={handleCreate}>
            <motion.div
              className="service-create-main"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...pageTransition, delay: 0.08 }}
            >
              <div className="service-card">
                <div className="service-section-head">
                  <h3>Thông tin dịch vụ</h3>
                  <p>Nhập tên, giá, mô tả và hình ảnh dịch vụ.</p>
                </div>

                <div className="service-form-grid">
                  <div className="service-field">
                    <label>Tên dịch vụ</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nhập tên dịch vụ"
                    />
                  </div>

                  <div className="service-field">
                    <label>Giá dịch vụ</label>
                    <input
                      value={price}
                      onChange={(e) =>
                        setPrice(formatPriceInput(e.target.value))
                      }
                      placeholder="Nhập giá dịch vụ"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="service-field service-field-full">
                    <label>Mô tả</label>
                    <textarea
                      rows={8}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Nhập mô tả dịch vụ"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="service-create-side"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...pageTransition, delay: 0.12 }}
            >
              <div className="service-card">
                <div className="service-section-head">
                  <h3>Hiển thị & trạng thái</h3>
                  <p>Chọn trạng thái hoạt động và cấu hình hình ảnh.</p>
                </div>

                <div className="service-field">
                  <label>Trạng thái</label>
                  <div className="service-select-wrap">
                    <select
                      className="service-status-select"
                      value={String(isActive)}
                      onChange={(e) => setIsActive(e.target.value === 'true')}
                    >
                      <option value="true">Đang hoạt động</option>
                      <option value="false">Tạm ẩn</option>
                    </select>
                    <span className="service-select-arrow">▾</span>
                  </div>
                </div>

                <div className="service-field">
                  <label>Hình ảnh</label>

                  <div className="service-thumb-tabs">
                    <button
                      type="button"
                      className={`service-thumb-tab ${
                        imageMode === 'url' ? 'is-active' : ''
                      }`}
                      onClick={() => {
                        setImageMode('url')
                        setImageFile(null)
                        setImageFileName('')
                        if (!imageUrl) setImagePreview('')
                        if (fileInputRef.current)
                          fileInputRef.current.value = ''
                      }}
                    >
                      Link ảnh
                    </button>

                    <button
                      type="button"
                      className={`service-thumb-tab ${
                        imageMode === 'file' ? 'is-active' : ''
                      }`}
                      onClick={() => setImageMode('file')}
                    >
                      File ảnh
                    </button>
                  </div>

                  {imageMode === 'url' ? (
                    <motion.div
                      key="image-url"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
                        value={imageUrl}
                        onChange={(e) => handleChangeImageUrl(e.target.value)}
                        placeholder="https://example.com/service.jpg"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="image-file"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="service-upload-box"
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
                        <div className="service-upload-inner">
                          <motion.div
                            className="service-upload-icon"
                            animate={
                              imageLoading
                                ? { scale: [1, 1.08, 1] }
                                : { scale: 1 }
                            }
                            transition={
                              imageLoading
                                ? {
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }
                                : { duration: 0.2 }
                            }
                          >
                            🖼️
                          </motion.div>

                          {imageFileName ? (
                            <div className="service-upload-text">
                              <strong>{imageFileName}</strong>
                              <span>Click để chọn ảnh khác</span>
                            </div>
                          ) : (
                            <div className="service-upload-text">
                              <strong>
                                {imageLoading
                                  ? 'Đang xử lý ảnh...'
                                  : 'Chọn ảnh từ máy'}
                              </strong>
                              <span>PNG, JPG, WEBP, GIF tối đa 5MB</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="service-hidden-file-input"
                        onChange={handleImageFileChange}
                      />
                    </motion.div>
                  )}

                  <div className="service-thumb-helper">
                    {imageMode === 'url'
                      ? 'Dán link ảnh trực tiếp để dùng cho dịch vụ.'
                      : imageFileName
                        ? `Đã chọn file: ${imageFileName}`
                        : 'Click vào khung bên trên để chọn file ảnh từ máy.'}
                  </div>

                  {imagePreview ? (
                    <motion.button
                      type="button"
                      className="service-btn"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClearImage}
                    >
                      Xóa ảnh
                    </motion.button>
                  ) : null}
                </div>

                <div className="service-preview-box">
                  {imagePreview ? (
                    <motion.img
                      key={imagePreview}
                      src={imagePreview}
                      alt={name || 'service'}
                      className="service-preview-image"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                    />
                  ) : (
                    <div className="service-preview-placeholder">
                      <div className="service-preview-placeholder-icon">🧾</div>
                      <div>Chưa có hình ảnh dịch vụ</div>
                    </div>
                  )}
                </div>

                <div className="service-action-stack">
                  <motion.button
                    type="submit"
                    className="service-btn service-btn-primary"
                    disabled={saving || imageLoading}
                    whileHover={saving || imageLoading ? undefined : { y: -2 }}
                    whileTap={
                      saving || imageLoading ? undefined : { scale: 0.98 }
                    }
                  >
                    {saving ? 'Đang tạo...' : 'Tạo dịch vụ'}
                  </motion.button>

                  <motion.button
                    type="button"
                    className="service-btn"
                    onClick={handleResetForm}
                    disabled={saving || imageLoading}
                    whileHover={saving || imageLoading ? undefined : { y: -2 }}
                    whileTap={
                      saving || imageLoading ? undefined : { scale: 0.98 }
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
