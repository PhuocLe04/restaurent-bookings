'use client'

import 'animate.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import './page.css'

type Category = {
  id: number
  name: string
  is_active?: boolean | null
}

type CategoryListResponse = {
  items: Category[]
}

type ImageMode = 'link' | 'file'

function parsePriceValue(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits)
}

function formatPriceDisplay(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toLocaleString('vi-VN')
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export default function CreateMenuItemPage() {
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [priceValue, setPriceValue] = useState(0)

  const [imageMode, setImageMode] = useState<ImageMode>('link')
  const [imageLink, setImageLink] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageFileName, setImageFileName] = useState('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  const [isAvailable, setIsAvailable] = useState(true)

  const [saving, setSaving] = useState(false)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastType, setToastType] = useState<MessageType>('info')
  const [toastTitle, setToastTitle] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastKey, setToastKey] = useState(0)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  function showToast(
    type: MessageType,
    title: string,
    message: string,
    autoClose = 3500,
  ) {
    setToastType(type)
    setToastTitle(title)
    setToastMessage(message)
    setToastKey((prev) => prev + 1)
    setToastOpen(true)

    if (autoClose <= 0) return
  }

  useEffect(() => {
    let mounted = true

    async function loadCategories() {
      try {
        setLoadingCategories(true)

        const res = await fetch('/admin/api/categories?limit=100', {
          cache: 'no-store',
        })
        const data: CategoryListResponse = await res.json()

        if (!res.ok) {
          throw new Error((data as any)?.message || 'Không tải được danh mục')
        }

        if (!mounted) return

        setCategories(
          Array.isArray(data.items)
            ? data.items.filter((item) => item.is_active !== false)
            : [],
        )
      } catch (err: any) {
        if (!mounted) return
        showToast(
          'error',
          'Lỗi tải dữ liệu',
          err?.message || 'Không tải được danh mục',
        )
      } finally {
        if (mounted) setLoadingCategories(false)
      }
    }

    loadCategories()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('')
      return
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  const imagePreview = useMemo(() => {
    if (imageMode === 'file') return imagePreviewUrl
    return imageLink.trim()
  }, [imageMode, imagePreviewUrl, imageLink])

  const priceInputValue = useMemo(
    () => formatPriceDisplay(priceValue),
    [priceValue],
  )

  const pricePreview = useMemo(() => {
    if (!Number.isFinite(priceValue) || priceValue < 0) return '0₫'
    return `${priceValue.toLocaleString('vi-VN')}₫`
  }, [priceValue])

  const selectedCategoryName = useMemo(() => {
    return (
      categories.find((c) => String(c.id) === categoryId)?.name || 'Chưa chọn'
    )
  }, [categories, categoryId])

  const isDirty = useMemo(() => {
    return Boolean(
      name.trim() ||
      categoryId ||
      priceValue > 0 ||
      imageLink.trim() ||
      imageFile ||
      imageFileName ||
      imageMode === 'file' ||
      isAvailable === false,
    )
  }, [
    name,
    categoryId,
    priceValue,
    imageLink,
    imageFile,
    imageFileName,
    imageMode,
    isAvailable,
  ])

  function changePrice(delta: number) {
    setPriceValue((prev) => Math.max(0, prev + delta))
  }

  function handlePriceInputChange(value: string) {
    setPriceValue(parsePriceValue(value))
  }

  function handleQuickPrice(amount: number) {
    setPriceValue(amount)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]

    if (!file) {
      setImageFile(null)
      setImageFileName('')
      return
    }

    if (!file.type.startsWith('image/')) {
      showToast('error', 'File không hợp lệ', 'Vui lòng chọn file ảnh hợp lệ')
      e.target.value = ''
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showToast('warning', 'Ảnh quá lớn', 'Ảnh tối đa 5MB')
      e.target.value = ''
      return
    }

    setImageFile(file)
    setImageFileName(file.name)
    showToast(
      'success',
      'Tải ảnh thành công',
      `Đã chọn file: ${file.name}`,
      2200,
    )
  }

  function resetForm() {
    setName('')
    setCategoryId('')
    setPriceValue(0)
    setImageMode('link')
    setImageLink('')
    setImageFile(null)
    setImageFileName('')
    setImagePreviewUrl('')
    setIsAvailable(true)
  }

  function handleCancelClick(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault()

    if (saving) return

    if (!isDirty) {
      router.push('/admin/menu-items')
      return
    }

    setShowCancelConfirm(true)
  }

  function confirmCancel() {
    setShowCancelConfirm(false)
    router.push('/admin/menu-items')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    if (!name.trim()) {
      showToast('warning', 'Thiếu dữ liệu', 'Vui lòng nhập tên món ăn')
      return
    }

    if (!Number.isFinite(Number(categoryId)) || Number(categoryId) <= 0) {
      showToast('warning', 'Thiếu dữ liệu', 'Vui lòng chọn danh mục')
      return
    }

    if (!Number.isFinite(priceValue) || priceValue < 0) {
      showToast('warning', 'Giá không hợp lệ', 'Giá món ăn không hợp lệ')
      return
    }

    if (imageMode === 'file' && !imageFile) {
      showToast('warning', 'Thiếu ảnh', 'Vui lòng chọn file ảnh')
      return
    }

    try {
      setSaving(true)
      setToastOpen(true)
      setToastType('info')
      setToastTitle('Đang xử lý')
      setToastMessage('Đang tạo món ăn...')
      setToastKey((prev) => prev + 1)

      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('category_id', String(Number(categoryId)))
      formData.append('price', String(priceValue))
      formData.append('is_available', String(isAvailable))

      if (imageMode === 'link') {
        if (imageLink.trim()) {
          formData.append('image', imageLink.trim())
        }
      } else if (imageFile) {
        formData.append('image_file', imageFile)
      }

      const res = await fetch('/admin/api/menu-items', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Tạo món ăn thất bại')
      }

      showToast(
        'success',
        'Thành công',
        data?.message || 'Tạo món ăn thành công',
        2500,
      )

      resetForm()

      setTimeout(() => {
        router.push('/admin/menu-items')
      }, 900)
    } catch (err: any) {
      showToast('error', 'Tạo thất bại', err?.message || 'Có lỗi xảy ra', 4200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="menu-create-page">
      <div className="menu-create-shell">
        <motion.div
          className="menu-hero animate__animated animate__fadeInDown"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: EASE_OUT }}
        >
          <motion.div
            className="menu-hero__glow menu-hero__glow--1"
            animate={{ x: [0, 10, 0], y: [0, -6, 0], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="menu-hero__glow menu-hero__glow--2"
            animate={{
              x: [0, -10, 0],
              y: [0, 8, 0],
              opacity: [0.7, 0.95, 0.7],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="menu-hero__content">
            <h1 className="menu-create-title">Tạo món ăn mới</h1>

            <div className="menu-hero__stats">
              <motion.div
                className="menu-hero__stat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.05, ease: EASE_OUT }}
                whileHover={{ y: -3, scale: 1.01 }}
              >
                <span className="menu-hero__stat-label">Tên món</span>
                <strong>{name.trim() || 'Chưa nhập'}</strong>
              </motion.div>

              <motion.div
                className="menu-hero__stat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.1, ease: EASE_OUT }}
                whileHover={{ y: -3, scale: 1.01 }}
              >
                <span className="menu-hero__stat-label">Giá hiện tại</span>
                <strong>{pricePreview}</strong>
              </motion.div>

              <motion.div
                className="menu-hero__stat"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.15, ease: EASE_OUT }}
                whileHover={{ y: -3, scale: 1.01 }}
              >
                <span className="menu-hero__stat-label">Trạng thái</span>
                <strong>{isAvailable ? 'Đang bán' : 'Tạm ẩn'}</strong>
              </motion.div>
            </div>
          </div>

          <div className="menu-hero__actions">
            <motion.button
              type="button"
              className="menu-btn menu-btn--ghost"
              onClick={handleCancelClick}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              ← Quay lại
            </motion.button>
          </div>
        </motion.div>

        <div className="menu-create-grid">
          <motion.form
            onSubmit={handleSubmit}
            className="menu-create-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
          >
            <motion.div
              className="menu-section"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.03 }}
            >
              <div className="menu-section__head">
                <div>
                  <h2>Thông tin cơ bản</h2>
                </div>
                <p>Nhập tên món, danh mục và giá bán hiển thị.</p>
              </div>

              <div className="menu-form-grid">
                <div className="menu-form-field menu-form-field--full">
                  <label htmlFor="menu-name">Tên món ăn</label>
                  <motion.input
                    id="menu-name"
                    type="text"
                    placeholder="Ví dụ: Bò lúc lắc sốt tiêu đen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                    whileFocus={{ scale: 1.01 }}
                  />
                </div>

                <div className="menu-form-field">
                  <label htmlFor="menu-category">Danh mục</label>
                  <div className="menu-select-wrap">
                    <select
                      id="menu-category"
                      className="menu-select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      disabled={saving || loadingCategories}
                    >
                      <option value="">
                        {loadingCategories
                          ? 'Đang tải danh mục...'
                          : '-- Chọn danh mục --'}
                      </option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <span className="menu-select-icon">
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="menu-form-field">
                  <label htmlFor="menu-price">Giá bán</label>

                  <div className="menu-price-wrap">
                    <motion.button
                      type="button"
                      className="menu-price-btn"
                      onClick={() => changePrice(-1000)}
                      disabled={saving || priceValue <= 0}
                      whileHover={!saving && priceValue > 0 ? { y: -2 } : {}}
                      whileTap={
                        !saving && priceValue > 0 ? { scale: 0.96 } : {}
                      }
                    >
                      −
                    </motion.button>

                    <motion.input
                      id="menu-price"
                      type="text"
                      inputMode="numeric"
                      className="menu-price-input"
                      placeholder="Ví dụ: 200.000"
                      value={priceInputValue}
                      onChange={(e) => handlePriceInputChange(e.target.value)}
                      disabled={saving}
                      key={pricePreview}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.015, 1] }}
                      transition={{ duration: 0.2 }}
                    />

                    <motion.button
                      type="button"
                      className="menu-price-btn"
                      onClick={() => changePrice(1000)}
                      disabled={saving}
                      whileHover={!saving ? { y: -2 } : {}}
                      whileTap={!saving ? { scale: 0.96 } : {}}
                    >
                      +
                    </motion.button>
                  </div>

                  <motion.div
                    className="menu-price-hint"
                    key={pricePreview + '-hint'}
                    initial={{ opacity: 0.7, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    Hiển thị: <strong>{pricePreview}</strong>
                  </motion.div>

                  <div className="menu-price-quick">
                    {[49000, 79000, 99000, 129000, 159000].map((amount) => (
                      <motion.button
                        key={amount}
                        type="button"
                        className={`menu-chip ${priceValue === amount ? 'is-active' : ''}`}
                        onClick={() => handleQuickPrice(amount)}
                        disabled={saving}
                        whileHover={!saving ? { y: -2 } : {}}
                        whileTap={!saving ? { scale: 0.97 } : {}}
                        layout
                      >
                        {amount.toLocaleString('vi-VN')}₫
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="menu-section"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.06 }}
            >
              <div className="menu-section__head">
                <div>
                  <h2>Hình ảnh món ăn</h2>
                </div>
                <p>Chọn dùng link ảnh hoặc tải file trực tiếp từ máy.</p>
              </div>

              <div className="menu-form-field menu-form-field--full">
                <div className="menu-image-mode">
                  <motion.button
                    type="button"
                    className={`menu-image-mode-btn ${
                      imageMode === 'link' ? 'is-active' : ''
                    }`}
                    onClick={() => setImageMode('link')}
                    disabled={saving}
                    whileHover={!saving ? { y: -1 } : {}}
                    whileTap={!saving ? { scale: 0.98 } : {}}
                    layout
                  >
                    Dùng link
                  </motion.button>

                  <motion.button
                    type="button"
                    className={`menu-image-mode-btn ${
                      imageMode === 'file' ? 'is-active' : ''
                    }`}
                    onClick={() => setImageMode('file')}
                    disabled={saving}
                    whileHover={!saving ? { y: -1 } : {}}
                    whileTap={!saving ? { scale: 0.98 } : {}}
                    layout
                  >
                    Tải file
                  </motion.button>
                </div>

                <AnimatePresence mode="wait">
                  {imageMode === 'link' ? (
                    <motion.input
                      key="image-link-mode"
                      id="menu-image-link"
                      type="text"
                      placeholder="https://... hoặc /uploads/..."
                      value={imageLink}
                      onChange={(e) => setImageLink(e.target.value)}
                      disabled={saving}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    />
                  ) : (
                    <motion.div
                      key="image-file-mode"
                      className="menu-upload-box"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
                        id="menu-image-file"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={saving}
                      />
                      <label
                        htmlFor="menu-image-file"
                        className="menu-upload-label animate__animated animate__fadeIn"
                      >
                        <span className="menu-upload-label__icon">↑</span>
                        <span className="menu-upload-label__text">
                          Chọn file ảnh từ máy
                        </span>
                        <span className="menu-upload-label__sub">
                          PNG, JPG, WEBP · tối đa 5MB
                        </span>
                      </label>

                      <div className="menu-upload-file-name">
                        {imageFileName || 'Chưa chọn file'}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div
              className="menu-section"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.09 }}
            >
              <div className="menu-section__head">
                <div>
                  <h2>Trạng thái hiển thị</h2>
                </div>
                <p>Chọn món ăn đang bán hoặc tạm ẩn trên hệ thống.</p>
              </div>

              <div className="menu-status-grid">
                <motion.button
                  type="button"
                  className={`menu-status-card ${isAvailable ? 'is-active is-success' : ''}`}
                  onClick={() => setIsAvailable(true)}
                  disabled={saving}
                  whileHover={!saving ? { y: -3 } : {}}
                  whileTap={!saving ? { scale: 0.985 } : {}}
                  layout
                >
                  <div className="menu-status-card__dot" />
                  <div>
                    <strong>Đang bán</strong>
                    <p>Món ăn hiển thị và có thể được chọn.</p>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  className={`menu-status-card ${!isAvailable ? 'is-active is-muted' : ''}`}
                  onClick={() => setIsAvailable(false)}
                  disabled={saving}
                  whileHover={!saving ? { y: -3 } : {}}
                  whileTap={!saving ? { scale: 0.985 } : {}}
                  layout
                >
                  <div className="menu-status-card__dot" />
                  <div>
                    <strong>Tạm ẩn</strong>
                    <p>Ẩn món ăn khỏi danh sách đang phục vụ.</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>

            <div className="menu-create-actions">
              <motion.button
                type="button"
                className="menu-btn menu-btn--ghost"
                onClick={handleCancelClick}
                disabled={saving}
                whileHover={!saving ? { y: -2 } : {}}
                whileTap={!saving ? { scale: 0.98 } : {}}
              >
                Hủy
              </motion.button>

              <motion.button
                type="submit"
                className="menu-btn menu-btn--primary"
                disabled={saving}
                whileHover={!saving ? { y: -2, scale: 1.01 } : {}}
                whileTap={!saving ? { scale: 0.985 } : {}}
              >
                {saving ? 'Đang tạo...' : 'Tạo món ăn'}
              </motion.button>
            </div>
          </motion.form>

          <motion.aside
            className="menu-preview-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.04, ease: EASE_OUT }}
          >
            <div className="menu-preview-head">
              <div>
                <h3>Xem trước món ăn</h3>
              </div>

              <motion.span
                className="menu-preview-price"
                key={pricePreview}
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                {pricePreview}
              </motion.span>
            </div>

            <div className="menu-preview-image-wrap">
              <AnimatePresence mode="wait">
                {imagePreview ? (
                  <motion.img
                    key={imagePreview}
                    src={imagePreview}
                    alt={name || 'preview'}
                    className="menu-preview-image"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.03 }}
                    transition={{ duration: 0.28 }}
                  />
                ) : (
                  <motion.div
                    key="empty-preview"
                    className="menu-preview-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span>Ảnh món ăn</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="menu-preview-body">
              <AnimatePresence mode="wait">
                <motion.h4
                  key={name.trim() || 'Tên món ăn'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={
                    name.trim() ? 'animate__animated animate__fadeIn' : ''
                  }
                >
                  {name.trim() || 'Tên món ăn'}
                </motion.h4>
              </AnimatePresence>

              <div className="menu-preview-meta">
                <motion.div
                  className="menu-preview-meta__item"
                  layout
                  whileHover={{ x: 4 }}
                >
                  <span>Danh mục</span>
                  <AnimatePresence mode="wait">
                    <motion.strong
                      key={selectedCategoryName}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {selectedCategoryName}
                    </motion.strong>
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  className="menu-preview-meta__item"
                  layout
                  whileHover={{ x: 4 }}
                >
                  <span>Nguồn ảnh</span>
                  <AnimatePresence mode="wait">
                    <motion.strong
                      key={
                        imageMode === 'link'
                          ? imageLink.trim()
                            ? 'link'
                            : 'none-link'
                          : imageFileName || 'none-file'
                      }
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {imageMode === 'link'
                        ? imageLink.trim()
                          ? 'Link ảnh'
                          : 'Chưa có'
                        : imageFileName || 'Chưa có'}
                    </motion.strong>
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      <LiquidGlassMessage
        type={toastType}
        title={toastTitle}
        message={toastMessage}
        isVisible={toastOpen}
        onClose={() => setToastOpen(false)}
        autoClose={saving ? 0 : 3500}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toastKey}
        loading={saving && toastType === 'info'}
      />

      <DeleteConfirmModal
        open={showCancelConfirm}
        title="Xác nhận hủy"
        message="Bạn đang có dữ liệu chưa lưu. Bạn có chắc muốn rời khỏi trang này không?"
        itemName={name.trim() || 'Món ăn mới'}
        loading={false}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={confirmCancel}
      />

      <AnimatePresence />
    </div>
  )
}
