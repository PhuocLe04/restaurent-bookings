'use client'

import 'animate.css'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

type MenuItemDetail = {
  id: number
  name: string
  image: string | null
  price: number | string
  is_available: boolean | null
  category_id: number | null
  categories?: Category | null
  combo_menu_items?: unknown[]
  order_items?: unknown[]
}

type CategoryListResponse = {
  items: Category[]
}

type DetailResponse = {
  item: MenuItemDetail
}

type ImageMode = 'link' | 'file'
type ConfirmMode = 'cancel' | 'delete' | null

function parsePriceValue(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits)
}

function formatPriceDisplay(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toLocaleString('vi-VN')
}

function normalizeImageMode(image: string | null | undefined): ImageMode {
  if (!image) return 'link'
  if (image.startsWith('/uploads/')) return 'file'
  return 'link'
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export default function MenuItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id || '')

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(true)

  const [itemId, setItemId] = useState<number | null>(null)
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
  const [deleting, setDeleting] = useState(false)

  const [toastOpen, setToastOpen] = useState(false)
  const [toastType, setToastType] = useState<MessageType>('info')
  const [toastTitle, setToastTitle] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastKey, setToastKey] = useState(0)

  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)

  const [initialData, setInitialData] = useState<{
    name: string
    categoryId: string
    priceValue: number
    imageLink: string
    isAvailable: boolean
  } | null>(null)

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
    if (!imageFile) {
      setImagePreviewUrl('')
      return
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

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
          'Lỗi tải danh mục',
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
    let mounted = true

    async function loadDetail() {
      if (!id) return

      try {
        setLoadingDetail(true)

        const res = await fetch(`/admin/api/menu-items/${id}`, {
          cache: 'no-store',
        })
        const data: DetailResponse = await res.json()

        if (!res.ok) {
          throw new Error((data as any)?.message || 'Không tải được món ăn')
        }

        if (!mounted || !data?.item) return

        const item = data.item
        const normalizedPrice = Number(item.price || 0)
        const normalizedImage = item.image || ''
        const normalizedAvailable = item.is_available !== false
        const normalizedCategoryId = item.category_id
          ? String(item.category_id)
          : ''

        setItemId(item.id)
        setName(item.name || '')
        setCategoryId(normalizedCategoryId)
        setPriceValue(Number.isFinite(normalizedPrice) ? normalizedPrice : 0)
        setImageMode(normalizeImageMode(normalizedImage))
        setImageLink(normalizedImage)
        setImageFile(null)
        setImageFileName('')
        setIsAvailable(normalizedAvailable)

        setInitialData({
          name: item.name || '',
          categoryId: normalizedCategoryId,
          priceValue: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
          imageLink: normalizedImage,
          isAvailable: normalizedAvailable,
        })
      } catch (err: any) {
        if (!mounted) return
        showToast(
          'error',
          'Lỗi tải dữ liệu',
          err?.message || 'Không tải được chi tiết món ăn',
        )
      } finally {
        if (mounted) setLoadingDetail(false)
      }
    }

    loadDetail()

    return () => {
      mounted = false
    }
  }, [id])

  const imagePreview = useMemo(() => {
    if (imageMode === 'file') {
      if (imagePreviewUrl) return imagePreviewUrl
      return imageLink.trim()
    }
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
    if (!initialData) return false

    return (
      name.trim() !== initialData.name.trim() ||
      categoryId !== initialData.categoryId ||
      priceValue !== initialData.priceValue ||
      imageLink.trim() !== initialData.imageLink.trim() ||
      Boolean(imageFile) ||
      isAvailable !== initialData.isAvailable
    )
  }, [
    initialData,
    name,
    categoryId,
    priceValue,
    imageLink,
    imageFile,
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

    setImageMode('file')
    setImageFile(file)
    setImageFileName(file.name)

    showToast(
      'success',
      'Tải ảnh thành công',
      `Đã chọn file: ${file.name}`,
      2200,
    )
  }

  function handleCancelClick(e?: React.MouseEvent | React.FormEvent) {
    e?.preventDefault()

    if (saving || deleting) return

    if (!isDirty) {
      router.push('/admin/menu-items')
      return
    }

    setConfirmMode('cancel')
  }

  function handleDeleteClick() {
    if (saving || deleting) return
    setConfirmMode('delete')
  }

  function confirmCancel() {
    setConfirmMode(null)
    router.push('/admin/menu-items')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (saving || loadingDetail || !itemId) return

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

    if (imageMode === 'file' && !imageFile && !imageLink.trim()) {
      showToast('warning', 'Thiếu ảnh', 'Vui lòng chọn file ảnh')
      return
    }

    try {
      setSaving(true)
      setToastOpen(true)
      setToastType('info')
      setToastTitle('Đang xử lý')
      setToastMessage('Đang cập nhật món ăn...')
      setToastKey((prev) => prev + 1)

      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('category_id', String(Number(categoryId)))
      formData.append('price', String(priceValue))
      formData.append('is_available', String(isAvailable))

      if (imageMode === 'link') {
        formData.append('image', imageLink.trim())
      } else {
        if (imageFile) {
          formData.append('image_file', imageFile)
        } else {
          formData.append('image', imageLink.trim())
        }
      }

      const res = await fetch(`/admin/api/menu-items/${itemId}`, {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Cập nhật món ăn thất bại')
      }

      const updated = data?.item as MenuItemDetail | undefined
      const updatedImage = updated?.image || imageLink.trim()

      setImageLink(updatedImage)
      setImageMode(normalizeImageMode(updatedImage))
      setImageFile(null)
      setImageFileName('')

      setInitialData({
        name: name.trim(),
        categoryId,
        priceValue,
        imageLink: updatedImage,
        isAvailable,
      })

      showToast(
        'success',
        'Thành công',
        data?.message || 'Cập nhật món ăn thành công',
        2500,
      )
    } catch (err: any) {
      showToast(
        'error',
        'Cập nhật thất bại',
        err?.message || 'Có lỗi xảy ra',
        4200,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!itemId || deleting || saving) return

    try {
      setDeleting(true)
      setConfirmMode(null)

      const res = await fetch(`/admin/api/menu-items/${itemId}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Xóa món ăn thất bại')
      }

      showToast(
        'success',
        'Xóa thành công',
        data?.message || 'Đã xóa món ăn',
        2200,
      )

      setTimeout(() => {
        router.push('/admin/menu-items')
      }, 900)
    } catch (err: any) {
      showToast(
        'error',
        'Không thể xóa',
        err?.message || 'Có lỗi xảy ra khi xóa món ăn',
        4200,
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loadingDetail) {
    return (
      <div className="menu-detail-page">
        <div className="menu-detail-shell">
          <motion.div
            className="menu-detail-card animate__animated animate__fadeIn"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
          >
            <div className="menu-detail-section">
              <div className="menu-detail-section__head">
                <div>
                  <h2>Đang tải chi tiết món ăn...</h2>
                </div>
                <p>Vui lòng chờ trong giây lát.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-detail-page">
      <div className="menu-detail-shell">
        <motion.div
          className="menu-detail-hero animate__animated animate__fadeInDown"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: EASE_OUT }}
        >
          <div className="menu-detail-hero__glow menu-detail-hero__glow--1" />
          <div className="menu-detail-hero__glow menu-detail-hero__glow--2" />

          <div className="menu-detail-hero__content">
            <motion.h1
              className="menu-detail-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.08 }}
            >
              Chi tiết món ăn
            </motion.h1>

            <motion.p
              className="menu-detail-subtitle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.12 }}
            >
              Xem, chỉnh sửa, cập nhật hình ảnh, trạng thái và xóa món ăn trong
              giao diện quản trị.
            </motion.p>

            <motion.div
              className="menu-detail-hero__stats"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.16 }}
            >
              <motion.div
                className="menu-detail-hero__stat"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <span className="menu-detail-hero__stat-label">Tên món</span>
                <strong>{name.trim() || 'Chưa nhập'}</strong>
              </motion.div>

              <motion.div
                className="menu-detail-hero__stat"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <span className="menu-detail-hero__stat-label">
                  Giá hiện tại
                </span>
                <strong>{pricePreview}</strong>
              </motion.div>

              <motion.div
                className="menu-detail-hero__stat"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
              >
                <span className="menu-detail-hero__stat-label">Trạng thái</span>
                <strong>{isAvailable ? 'Đang bán' : 'Tạm ẩn'}</strong>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            className="menu-detail-hero__actions animate__animated animate__fadeInRight"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.32, delay: 0.18 }}
          >
            <motion.button
              type="button"
              className="menu-detail-btn menu-detail-btn--ghost"
              onClick={handleCancelClick}
              disabled={saving || deleting}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.16 }}
            >
              ← Quay lại
            </motion.button>

            <motion.button
              type="button"
              className="menu-detail-btn menu-detail-btn--blog-delete"
              onClick={handleDeleteClick}
              disabled={saving || deleting}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.16 }}
            >
              <span className="menu-detail-btn__icon">🗑</span>
              {deleting ? 'Đang xóa...' : 'Xóa món'}
            </motion.button>
          </motion.div>
        </motion.div>

        <div className="menu-detail-grid">
          <motion.form
            onSubmit={handleUpdate}
            className="menu-detail-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: EASE_OUT }}
          >
            <motion.div
              className="menu-detail-section"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.05 }}
            >
              <div className="menu-detail-section__head">
                <div>
                  <h2>Thông tin cơ bản</h2>
                </div>
                <p>Chỉnh sửa tên món, danh mục và giá bán hiển thị.</p>
              </div>

              <div className="menu-detail-form-grid">
                <div className="menu-detail-field menu-detail-field--full">
                  <label htmlFor="menu-name">Tên món ăn</label>
                  <input
                    id="menu-name"
                    type="text"
                    placeholder="Ví dụ: Bò lúc lắc sốt tiêu đen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving || deleting}
                  />
                </div>

                <div className="menu-detail-field">
                  <label htmlFor="menu-category">Danh mục</label>
                  <div className="menu-detail-select-wrap">
                    <select
                      id="menu-category"
                      className="menu-detail-select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      disabled={saving || deleting || loadingCategories}
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

                    <span className="menu-detail-select-icon">
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

                <div className="menu-detail-field">
                  <label htmlFor="menu-price">Giá bán</label>

                  <div className="menu-detail-price-wrap">
                    <motion.button
                      type="button"
                      className="menu-detail-price-btn"
                      onClick={() => changePrice(-1000)}
                      disabled={saving || deleting || priceValue <= 0}
                      whileHover={{ y: -1, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      −
                    </motion.button>

                    <input
                      id="menu-price"
                      type="text"
                      inputMode="numeric"
                      className="menu-detail-price-input"
                      placeholder="Ví dụ: 200.000"
                      value={priceInputValue}
                      onChange={(e) => handlePriceInputChange(e.target.value)}
                      disabled={saving || deleting}
                    />

                    <motion.button
                      type="button"
                      className="menu-detail-price-btn"
                      onClick={() => changePrice(1000)}
                      disabled={saving || deleting}
                      whileHover={{ y: -1, scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      +
                    </motion.button>
                  </div>

                  <div className="menu-detail-price-hint">
                    Hiển thị: <strong>{pricePreview}</strong>
                  </div>

                  <div className="menu-detail-price-quick">
                    {[49000, 79000, 99000, 129000, 159000].map(
                      (amount, index) => (
                        <motion.button
                          key={amount}
                          type="button"
                          className={`menu-detail-chip ${
                            priceValue === amount ? 'is-active' : ''
                          }`}
                          onClick={() => handleQuickPrice(amount)}
                          disabled={saving || deleting}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: 0.05 * index }}
                          whileHover={{ y: -2, scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {amount.toLocaleString('vi-VN')}₫
                        </motion.button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="menu-detail-section animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.1 }}
            >
              <div className="menu-detail-section__head">
                <div>
                  <h2>Hình ảnh món ăn</h2>
                </div>
                <p>Đổi ảnh bằng link hoặc tải file trực tiếp từ máy.</p>
              </div>

              <div className="menu-detail-field menu-detail-field--full">
                <div className="menu-detail-image-mode">
                  <motion.button
                    type="button"
                    className={`menu-detail-image-mode-btn ${
                      imageMode === 'link' ? 'is-active' : ''
                    }`}
                    onClick={() => setImageMode('link')}
                    disabled={saving || deleting}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Dùng link
                  </motion.button>

                  <motion.button
                    type="button"
                    className={`menu-detail-image-mode-btn ${
                      imageMode === 'file' ? 'is-active' : ''
                    }`}
                    onClick={() => setImageMode('file')}
                    disabled={saving || deleting}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Tải file
                  </motion.button>
                </div>

                {imageMode === 'link' ? (
                  <motion.input
                    id="menu-image-link"
                    type="text"
                    placeholder="https://... hoặc /uploads/..."
                    value={imageLink}
                    onChange={(e) => {
                      setImageLink(e.target.value)
                      setImageFile(null)
                      setImageFileName('')
                    }}
                    disabled={saving || deleting}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <motion.div
                    className="menu-detail-upload-box animate__animated animate__fadeIn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <input
                      id="menu-image-file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={saving || deleting}
                    />
                    <motion.label
                      htmlFor="menu-image-file"
                      className="menu-detail-upload-label"
                      whileHover={{ y: -2, scale: 1.01 }}
                      transition={{ duration: 0.16 }}
                    >
                      <span className="menu-detail-upload-label__icon">↑</span>
                      <span className="menu-detail-upload-label__text">
                        Chọn file ảnh từ máy
                      </span>
                      <span className="menu-detail-upload-label__sub">
                        PNG, JPG, WEBP · tối đa 5MB
                      </span>
                    </motion.label>

                    <div className="menu-detail-upload-file-name">
                      {imageFileName || 'Chưa chọn file mới'}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <motion.div
              className="menu-detail-section animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.15 }}
            >
              <div className="menu-detail-section__head">
                <div>
                  <h2>Trạng thái hiển thị</h2>
                </div>
                <p>Chọn món ăn đang bán hoặc tạm ẩn trên hệ thống.</p>
              </div>

              <div className="menu-detail-status-grid">
                <motion.button
                  type="button"
                  className={`menu-detail-status-card ${
                    isAvailable ? 'is-active is-success' : ''
                  }`}
                  onClick={() => setIsAvailable(true)}
                  disabled={saving || deleting}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="menu-detail-status-card__dot" />
                  <div>
                    <strong>Đang bán</strong>
                    <p>Món ăn hiển thị và có thể được chọn.</p>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  className={`menu-detail-status-card ${
                    !isAvailable ? 'is-active is-muted' : ''
                  }`}
                  onClick={() => setIsAvailable(false)}
                  disabled={saving || deleting}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="menu-detail-status-card__dot" />
                  <div>
                    <strong>Tạm ẩn</strong>
                    <p>Ẩn món ăn khỏi danh sách đang phục vụ.</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              className="menu-detail-actions animate__animated animate__fadeInUp"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.2 }}
            >
              <div className="menu-detail-actions__right">
                <motion.button
                  type="button"
                  className="menu-detail-btn menu-detail-btn--ghost"
                  onClick={handleCancelClick}
                  disabled={saving || deleting}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Hủy
                </motion.button>

                <motion.button
                  type="submit"
                  className="menu-detail-btn menu-detail-btn--primary"
                  disabled={saving || deleting}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                </motion.button>
              </div>
            </motion.div>
          </motion.form>

          <motion.aside
            className="menu-detail-preview-card animate__animated animate__fadeInUp"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.38, delay: 0.08, ease: EASE_OUT }}
          >
            <div className="menu-detail-preview-head">
              <div>
                <h3>Xem trước món ăn</h3>
              </div>
              <motion.span
                className="menu-detail-preview-price"
                whileHover={{ y: -2 }}
              >
                {pricePreview}
              </motion.span>
            </div>

            <motion.div
              className="menu-detail-preview-image-wrap animate__animated animate__fadeIn"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.32, delay: 0.12 }}
            >
              {imagePreview ? (
                <motion.img
                  key={imagePreview}
                  src={imagePreview}
                  alt={name || 'preview'}
                  className="menu-detail-preview-image"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              ) : (
                <div className="menu-detail-preview-placeholder">
                  <span>Ảnh món ăn</span>
                </div>
              )}

              <div className="menu-detail-preview-overlay">
                <motion.span
                  className={`menu-detail-preview-badge ${
                    isAvailable ? 'is-available' : 'is-hidden'
                  }`}
                  key={String(isAvailable)}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {isAvailable ? 'Đang bán' : 'Tạm ẩn'}
                </motion.span>
              </div>
            </motion.div>

            <div className="menu-detail-preview-body">
              <motion.h4
                key={name || 'empty-name'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                {name.trim() || 'Tên món ăn'}
              </motion.h4>

              <div className="menu-detail-preview-meta">
                {[
                  ['Danh mục', selectedCategoryName],
                  [
                    'Nguồn ảnh',
                    imageMode === 'link'
                      ? imageLink.trim()
                        ? 'Link ảnh'
                        : 'Chưa có'
                      : imageFileName || imageLink.trim() || 'Chưa có',
                  ],
                  ['Mã món', `#${itemId || '--'}`],
                  ['Trạng thái', isAvailable ? 'Đang bán' : 'Tạm ẩn'],
                ].map(([label, value], index) => (
                  <motion.div
                    key={label}
                    className="menu-detail-preview-meta__item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.05 * index }}
                    whileHover={{ y: -2 }}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </motion.div>
                ))}
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
        autoClose={saving || deleting ? 0 : 3500}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toastKey}
        loading={(saving || deleting) && toastType === 'info'}
      />

      <DeleteConfirmModal
        open={confirmMode !== null}
        title={
          confirmMode === 'delete' ? 'Xác nhận xóa món ăn' : 'Xác nhận hủy'
        }
        message={
          confirmMode === 'delete'
            ? 'Bạn có chắc muốn xóa món ăn này không? Hành động này không thể hoàn tác.'
            : 'Bạn đang có dữ liệu chưa lưu. Bạn có chắc muốn rời khỏi trang này không?'
        }
        itemName={name.trim() || 'Món ăn'}
        loading={deleting}
        onClose={() => setConfirmMode(null)}
        onConfirm={confirmMode === 'delete' ? handleDelete : confirmCancel}
      />

      <AnimatePresence />
    </div>
  )
}
