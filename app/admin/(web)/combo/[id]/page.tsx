'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import DeleteConfirmModal from '@/app/admin/ui/popup_delete/DeleteConfirm'
import './page.css'

type Category = {
  id: number
  name: string
}

type MenuItem = {
  id: number
  name: string
  price: number | string
  category_id?: number | null
  categories?: Category | null
  category?: Category | null
}

type ServiceItem = {
  id: number
  name: string
  price: number | string
}

type ComboMenuItemDetail = {
  menu_item_id: number
  quantity: number
  unit_price: number | string
  menu_items: MenuItem
}

type ComboServiceDetail = {
  service_id: number
  quantity: number
  unit_price: number | string
  services: ServiceItem
}

type ComboDetailResponse = {
  id: number
  title: string
  description: string | null
  discount_percent: number | null
  is_active: boolean | null
  sale_price: number | string | null
  total_origin_price: number | string | null
  combo_menu_items: ComboMenuItemDetail[]
  combo_services: ComboServiceDetail[]
}

type SelectedMenu = {
  menu_item_id: number
  name: string
  unit_price: number
  quantity: number
}

type SelectedService = {
  service_id: number
  name: string
  unit_price: number
  quantity: number
}

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  loading?: boolean
  key: number
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatPrice(value: number) {
  return value.toLocaleString('vi-VN') + 'đ'
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function getMenuCategoryName(item: MenuItem) {
  return item.categories?.name || item.category?.name || 'Chưa phân loại'
}

function getMenuCategoryId(item: MenuItem) {
  return item.category_id || item.categories?.id || item.category?.id || null
}

export default function ComboDetailPage() {
  const router = useRouter()
  const params = useParams()
  const comboId = String(params?.id || '')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountInput, setDiscountInput] = useState('0')
  const [discountFocused, setDiscountFocused] = useState(false)
  const [isActive, setIsActive] = useState(true)

  const [menuOptions, setMenuOptions] = useState<MenuItem[]>([])
  const [serviceOptions, setServiceOptions] = useState<ServiceItem[]>([])
  const [selectedMenus, setSelectedMenus] = useState<SelectedMenu[]>([])
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    [],
  )

  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [menuSearch, setMenuSearch] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all')

  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false)
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false)

  const [menuPopupOpen, setMenuPopupOpen] = useState(false)
  const [servicePopupOpen, setServicePopupOpen] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  const menuDropdownRef = useRef<HTMLDivElement | null>(null)
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null)

  const safeDiscountPercent = useMemo(() => {
    if (!discountInput.trim()) return 0
    return clampPercent(toNumber(discountInput, 0))
  }, [discountInput])

  function showToast(
    type: MessageType,
    title: string,
    message: string,
    loading = false,
  ) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      loading,
      key: prev.key + 1,
    }))
  }

  function closeToast() {
    setToast((prev) => ({ ...prev, visible: false, loading: false }))
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node

      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(target)
      ) {
        setMenuDropdownOpen(false)
      }

      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(target)
      ) {
        setServiceDropdownOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuDropdownOpen(false)
        setServiceDropdownOpen(false)
        setMenuPopupOpen(false)
        setServicePopupOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow =
      menuPopupOpen || servicePopupOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuPopupOpen, servicePopupOpen])

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        setLoadingData(true)

        const [menuRes, serviceRes, comboRes] = await Promise.all([
          fetch('/admin/api/menu-items?limit=1000', { cache: 'no-store' }),
          fetch('/admin/api/reservation-services?limit=1000', {
            cache: 'no-store',
          }),
          fetch(`/admin/api/combo/${comboId}`, { cache: 'no-store' }),
        ])

        const menuJson = await menuRes.json().catch(() => ({}))
        const serviceJson = await serviceRes.json().catch(() => ({}))
        const comboJson = await comboRes.json().catch(() => ({}))

        if (!menuRes.ok) {
          throw new Error(menuJson.message || 'Không tải được danh sách món ăn')
        }

        if (!serviceRes.ok) {
          throw new Error(
            serviceJson.message || 'Không tải được danh sách dịch vụ',
          )
        }

        if (!comboRes.ok) {
          throw new Error(comboJson.message || 'Không tải được chi tiết combo')
        }

        if (!active) return

        const item: ComboDetailResponse | undefined = comboJson.item
        if (!item) throw new Error('Không có dữ liệu combo')

        setMenuOptions(Array.isArray(menuJson.items) ? menuJson.items : [])
        setServiceOptions(
          Array.isArray(serviceJson.items) ? serviceJson.items : [],
        )

        setTitle(item.title || '')
        setDescription(item.description || '')
        setDiscountInput(String(toNumber(item.discount_percent, 0)))
        setIsActive(Boolean(item.is_active))

        setSelectedMenus(
          Array.isArray(item.combo_menu_items)
            ? item.combo_menu_items.map((x) => ({
                menu_item_id: x.menu_item_id,
                name: x.menu_items?.name || `Món #${x.menu_item_id}`,
                unit_price: toNumber(
                  x.menu_items?.price,
                  toNumber(x.unit_price, 0),
                ),
                quantity: toNumber(x.quantity, 1),
              }))
            : [],
        )

        setSelectedServices(
          Array.isArray(item.combo_services)
            ? item.combo_services.map((x) => ({
                service_id: x.service_id,
                name: x.services?.name || `Dịch vụ #${x.service_id}`,
                unit_price: toNumber(
                  x.services?.price,
                  toNumber(x.unit_price, 0),
                ),
                quantity: toNumber(x.quantity, 1),
              }))
            : [],
        )
      } catch (err: any) {
        if (!active) return
        showToast('error', 'Lỗi tải dữ liệu', err?.message || 'Có lỗi xảy ra')
      } finally {
        if (active) setLoadingData(false)
      }
    }

    if (comboId) loadData()

    return () => {
      active = false
    }
  }, [comboId])

  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>()

    menuOptions.forEach((item) => {
      const categoryId = getMenuCategoryId(item)
      const categoryName = getMenuCategoryName(item)
      if (categoryId) map.set(categoryId, categoryName)
    })

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [menuOptions])

  const filteredMenuOptions = useMemo(() => {
    const keyword = menuSearch.trim().toLowerCase()

    return menuOptions.filter((item) => {
      const matchedKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        getMenuCategoryName(item).toLowerCase().includes(keyword)

      const categoryId = getMenuCategoryId(item)
      const matchedCategory =
        menuCategoryFilter === 'all' ||
        String(categoryId || '') === menuCategoryFilter

      return matchedKeyword && matchedCategory
    })
  }, [menuOptions, menuSearch, menuCategoryFilter])

  const filteredServiceOptions = useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase()
    return serviceOptions.filter((item) => {
      return !keyword || item.name.toLowerCase().includes(keyword)
    })
  }, [serviceOptions, serviceSearch])

  const totalMenuPrice = useMemo(() => {
    return selectedMenus.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    )
  }, [selectedMenus])

  const totalServicePrice = useMemo(() => {
    return selectedServices.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    )
  }, [selectedServices])

  const totalOriginPrice = totalMenuPrice + totalServicePrice
  const discountAmount = Math.round(
    totalOriginPrice * (safeDiscountPercent / 100),
  )
  const salePrice = Math.max(0, totalOriginPrice - discountAmount)

  const visibleMenus = selectedMenus.slice(0, 2)
  const visibleServices = selectedServices.slice(0, 2)

  function updateDiscountValue(rawValue: string) {
    const sanitized = rawValue.replace(/[^\d]/g, '')
    if (sanitized === '') {
      setDiscountInput('')
      return
    }

    const nextValue = clampPercent(toNumber(sanitized, 0))
    setDiscountInput(String(nextValue))
  }

  function decreaseDiscount() {
    setDiscountInput(String(clampPercent(safeDiscountPercent - 1)))
  }

  function increaseDiscount() {
    setDiscountInput(String(clampPercent(safeDiscountPercent + 1)))
  }

  function addMenuById(id: number) {
    if (!id) return
    const found = menuOptions.find((item) => item.id === id)
    if (!found) return

    let existedBefore = false

    setSelectedMenus((prev) => {
      const existed = prev.find((item) => item.menu_item_id === id)
      existedBefore = !!existed

      if (existed) {
        return prev.map((item) =>
          item.menu_item_id === id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...prev,
        {
          menu_item_id: found.id,
          name: found.name,
          unit_price: toNumber(found.price),
          quantity: 1,
        },
      ]
    })

    showToast(
      'success',
      existedBefore ? 'Đã cập nhật món ăn' : 'Đã thêm món ăn',
      existedBefore
        ? `Đã tăng số lượng "${found.name}" thêm 1`
        : `Đã thêm "${found.name}" vào combo`,
    )

    setMenuDropdownOpen(false)
    setMenuSearch('')
  }

  function addServiceById(id: number) {
    if (!id) return
    const found = serviceOptions.find((item) => item.id === id)
    if (!found) return

    let existedBefore = false

    setSelectedServices((prev) => {
      const existed = prev.find((item) => item.service_id === id)
      existedBefore = !!existed

      if (existed) {
        return prev.map((item) =>
          item.service_id === id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...prev,
        {
          service_id: found.id,
          name: found.name,
          unit_price: toNumber(found.price),
          quantity: 1,
        },
      ]
    })

    showToast(
      'success',
      existedBefore ? 'Đã cập nhật dịch vụ' : 'Đã thêm dịch vụ',
      existedBefore
        ? `Đã tăng số lượng "${found.name}" thêm 1`
        : `Đã thêm "${found.name}" vào combo`,
    )

    setServiceDropdownOpen(false)
    setServiceSearch('')
  }

  function updateMenuQuantity(menu_item_id: number, quantity: number) {
    setSelectedMenus((prev) =>
      prev.map((item) =>
        item.menu_item_id === menu_item_id
          ? { ...item, quantity: quantity > 0 ? quantity : 1 }
          : item,
      ),
    )
  }

  function updateServiceQuantity(service_id: number, quantity: number) {
    setSelectedServices((prev) =>
      prev.map((item) =>
        item.service_id === service_id
          ? { ...item, quantity: quantity > 0 ? quantity : 1 }
          : item,
      ),
    )
  }

  function changeMenuQuantity(menu_item_id: number, delta: number) {
    setSelectedMenus((prev) =>
      prev.map((item) =>
        item.menu_item_id === menu_item_id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    )
  }

  function changeServiceQuantity(service_id: number, delta: number) {
    setSelectedServices((prev) =>
      prev.map((item) =>
        item.service_id === service_id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    )
  }

  function removeMenu(menu_item_id: number) {
    const found = selectedMenus.find(
      (item) => item.menu_item_id === menu_item_id,
    )

    setSelectedMenus((prev) =>
      prev.filter((item) => item.menu_item_id !== menu_item_id),
    )

    showToast(
      'warning',
      'Đã xóa món ăn',
      found ? `Đã xóa "${found.name}" khỏi combo` : 'Đã xóa món ăn',
    )
  }

  function removeService(service_id: number) {
    const found = selectedServices.find(
      (item) => item.service_id === service_id,
    )

    setSelectedServices((prev) =>
      prev.filter((item) => item.service_id !== service_id),
    )

    showToast(
      'warning',
      'Đã xóa dịch vụ',
      found ? `Đã xóa "${found.name}" khỏi combo` : 'Đã xóa dịch vụ',
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      showToast('error', 'Thiếu thông tin', 'Tên combo là bắt buộc')
      return
    }

    if (selectedMenus.length === 0 && selectedServices.length === 0) {
      showToast(
        'error',
        'Chưa có dữ liệu',
        'Vui lòng chọn ít nhất 1 món hoặc 1 dịch vụ',
      )
      return
    }

    try {
      setSubmitting(true)
      showToast(
        'info',
        'Đang cập nhật combo',
        'Hệ thống đang xử lý dữ liệu',
        true,
      )

      const payload = {
        title: title.trim(),
        description: description.trim(),
        discount_percent: safeDiscountPercent,
        is_active: isActive,
        menu_items: selectedMenus.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
        })),
        services: selectedServices.map((item) => ({
          service_id: item.service_id,
          quantity: item.quantity,
        })),
      }

      const res = await fetch(`/admin/api/combo/${comboId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json.message || 'Cập nhật combo thất bại')
      }

      showToast(
        'success',
        'Cập nhật combo thành công',
        json.message || 'Combo đã được cập nhật',
      )
    } catch (err: any) {
      showToast(
        'error',
        'Cập nhật combo thất bại',
        err?.message || 'Có lỗi xảy ra',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true)

      const res = await fetch(`/admin/api/combo/${comboId}`, {
        method: 'DELETE',
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json.message || 'Xóa combo thất bại')
      }

      showToast(
        'success',
        'Xóa combo thành công',
        json.message || 'Combo đã được xóa',
      )

      setDeleteOpen(false)

      setTimeout(() => {
        router.push('/admin/combo')
      }, 700)
    } catch (err: any) {
      showToast('error', 'Xóa combo thất bại', err?.message || 'Có lỗi xảy ra')
    } finally {
      setDeleting(false)
    }
  }

  function renderSelectedMenuItem(item: SelectedMenu) {
    const itemTotal = item.unit_price * item.quantity
    const itemSale = Math.round(itemTotal * (1 - safeDiscountPercent / 100))

    return (
      <div className="combo-detail-picked-card" key={item.menu_item_id}>
        <div className="combo-detail-picked-card__main">
          <div className="combo-detail-picked-card__title-wrap">
            <div className="combo-detail-picked-card__title">{item.name}</div>
            <div className="combo-detail-picked-card__sub">
              Giá gốc: {formatPrice(item.unit_price)} / món
            </div>
          </div>

          <button
            type="button"
            className="combo-detail-remove-btn"
            onClick={() => removeMenu(item.menu_item_id)}
          >
            Xóa
          </button>
        </div>

        <div className="combo-detail-picked-card__bottom">
          <div className="combo-detail-picked-card__prices">
            <div className="combo-detail-price-chip">
              <span>Thành tiền</span>
              <strong>{formatPrice(itemTotal)}</strong>
            </div>
            <div className="combo-detail-price-chip combo-detail-price-chip--sale">
              <span>Sau giảm</span>
              <strong>{formatPrice(itemSale)}</strong>
            </div>
          </div>

          <div className="combo-detail-qty">
            <button
              type="button"
              className="combo-detail-qty__btn"
              onClick={() => changeMenuQuantity(item.menu_item_id, -1)}
            >
              −
            </button>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                updateMenuQuantity(
                  item.menu_item_id,
                  Math.max(1, toNumber(e.target.value, 1)),
                )
              }
            />

            <button
              type="button"
              className="combo-detail-qty__btn"
              onClick={() => changeMenuQuantity(item.menu_item_id, 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderSelectedServiceItem(item: SelectedService) {
    const itemTotal = item.unit_price * item.quantity
    const itemSale = Math.round(itemTotal * (1 - safeDiscountPercent / 100))

    return (
      <div className="combo-detail-picked-card" key={item.service_id}>
        <div className="combo-detail-picked-card__main">
          <div className="combo-detail-picked-card__title-wrap">
            <div className="combo-detail-picked-card__title">{item.name}</div>
            <div className="combo-detail-picked-card__sub">
              Giá gốc: {formatPrice(item.unit_price)} / dịch vụ
            </div>
          </div>

          <button
            type="button"
            className="combo-detail-remove-btn"
            onClick={() => removeService(item.service_id)}
          >
            Xóa
          </button>
        </div>

        <div className="combo-detail-picked-card__bottom">
          <div className="combo-detail-picked-card__prices">
            <div className="combo-detail-price-chip">
              <span>Thành tiền</span>
              <strong>{formatPrice(itemTotal)}</strong>
            </div>
            <div className="combo-detail-price-chip combo-detail-price-chip--sale">
              <span>Sau giảm</span>
              <strong>{formatPrice(itemSale)}</strong>
            </div>
          </div>

          <div className="combo-detail-qty">
            <button
              type="button"
              className="combo-detail-qty__btn"
              onClick={() => changeServiceQuantity(item.service_id, -1)}
            >
              −
            </button>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) =>
                updateServiceQuantity(
                  item.service_id,
                  Math.max(1, toNumber(e.target.value, 1)),
                )
              }
            />

            <button
              type="button"
              className="combo-detail-qty__btn"
              onClick={() => changeServiceQuantity(item.service_id, 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="combo-detail-page">
        <LiquidGlassMessage
          type={toast.type}
          title={toast.title}
          message={toast.message}
          isVisible={toast.visible}
          onClose={closeToast}
          toastKey={toast.key}
          loading={toast.loading}
        />

        <div className="combo-detail-shell">
          <div className="combo-detail-loading-card">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        toastKey={toast.key}
        loading={toast.loading}
      />

      <DeleteConfirmModal
        open={deleteOpen}
        loading={deleting}
        title="Xác nhận xóa combo"
        message="Hành động này sẽ xóa combo cùng toàn bộ món ăn và dịch vụ liên quan."
        itemName={title}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={handleDelete}
      />

      <div className="combo-detail-page">
        <div className="combo-detail-shell">
          <div className="combo-detail-hero">
            <div className="combo-detail-hero__glow combo-detail-hero__glow--1" />
            <div className="combo-detail-hero__glow combo-detail-hero__glow--2" />

            <div className="combo-detail-hero__content">
              <h1 className="combo-detail-hero__title">Chi tiết combo</h1>
              <p className="combo-detail-hero__subtitle">
                Chỉnh sửa thông tin combo, cập nhật món ăn, dịch vụ và quản lý
                trạng thái hoạt động.
              </p>
            </div>

            <div className="combo-detail-hero__actions">
              <span
                className={`combo-detail-status-pill ${isActive ? 'on' : 'off'}`}
              >
                {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
              </span>

              <button
                type="button"
                className="combo-detail-delete-btn"
                onClick={() => setDeleteOpen(true)}
              >
                Xóa combo
              </button>

              <Link href="/admin/combo" className="combo-detail-back-btn">
                Quay lại
              </Link>
            </div>
          </div>

          <form className="combo-detail-layout" onSubmit={handleSubmit}>
            <div className="combo-detail-main">
              <section className="combo-detail-card">
                <div className="combo-detail-card__head">
                  <div>
                    <h2 className="combo-detail-card__title">
                      Thông tin combo
                    </h2>
                    <p className="combo-detail-card__subtitle">
                      Chỉnh sửa thông tin cơ bản của combo
                    </p>
                  </div>
                </div>

                <div className="combo-detail-field">
                  <label>Tên combo</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Combo sinh nhật VIP"
                  />
                </div>

                <div className="combo-detail-field">
                  <label>Mô tả</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả ngắn cho combo"
                    rows={4}
                  />
                </div>

                <div className="combo-detail-info-grid">
                  <div className="combo-detail-field">
                    <label>Giảm giá (%)</label>

                    <div className="combo-detail-discount-box">
                      <button
                        type="button"
                        className="combo-detail-discount-box__btn"
                        onClick={decreaseDiscount}
                        disabled={safeDiscountPercent <= 0}
                      >
                        −
                      </button>

                      <div className="combo-detail-discount-box__input">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={discountInput}
                          onFocus={() => {
                            setDiscountFocused(true)
                            if (discountInput === '0') setDiscountInput('')
                          }}
                          onBlur={() => {
                            setDiscountFocused(false)
                            if (!discountInput.trim()) setDiscountInput('0')
                            else setDiscountInput(String(safeDiscountPercent))
                          }}
                          onChange={(e) => updateDiscountValue(e.target.value)}
                          placeholder="0"
                        />
                        <span>%</span>
                      </div>

                      <button
                        type="button"
                        className="combo-detail-discount-box__btn"
                        onClick={increaseDiscount}
                        disabled={safeDiscountPercent >= 100}
                      >
                        +
                      </button>
                    </div>

                    <div className="combo-detail-helper">
                      {discountFocused && discountInput === ''
                        ? 'Nhập phần trăm giảm giá từ 0 đến 100'
                        : `Giảm tối đa 100% • hiện tại ${safeDiscountPercent}%`}
                    </div>
                  </div>

                  <div className="combo-detail-field">
                    <label>Trạng thái</label>

                    <div className="combo-detail-state-card">
                      <button
                        type="button"
                        className={`combo-detail-switch ${isActive ? 'active' : ''}`}
                        onClick={() => setIsActive((prev) => !prev)}
                      >
                        <span className="combo-detail-switch__thumb" />
                      </button>

                      <div className="combo-detail-state-card__text">
                        <strong>
                          {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                        </strong>
                        <span>
                          {isActive
                            ? 'Combo có thể hiển thị và sử dụng'
                            : 'Combo tạm thời bị ẩn khỏi hệ thống'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="combo-detail-card">
                <div className="combo-detail-card__head">
                  <div>
                    <h2 className="combo-detail-card__title">Chọn món ăn</h2>
                    <p className="combo-detail-card__subtitle">
                      Tìm kiếm theo tên món hoặc lọc theo danh mục
                    </p>
                  </div>

                  <div className="combo-detail-counter">
                    {selectedMenus.length} món
                  </div>
                </div>

                <div className="combo-detail-picker" ref={menuDropdownRef}>
                  <div className="combo-detail-toolbar">
                    <div className="combo-detail-search">
                      <span className="combo-detail-search__icon">⌕</span>
                      <input
                        value={menuSearch}
                        onChange={(e) => {
                          setMenuSearch(e.target.value)
                          setMenuDropdownOpen(true)
                        }}
                        onFocus={() => setMenuDropdownOpen(true)}
                        placeholder="Tìm món ăn..."
                      />
                    </div>

                    <select
                      value={menuCategoryFilter}
                      onChange={(e) => {
                        setMenuCategoryFilter(e.target.value)
                        setMenuDropdownOpen(true)
                      }}
                    >
                      <option value="all">Tất cả danh mục</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="combo-detail-toolbar__action"
                      onClick={() => setMenuDropdownOpen((prev) => !prev)}
                    >
                      {menuDropdownOpen ? 'Đóng danh sách' : 'Mở danh sách'}
                    </button>
                  </div>

                  {menuDropdownOpen && (
                    <div className="combo-detail-option-list">
                      {filteredMenuOptions.length === 0 ? (
                        <div className="combo-detail-option-list__empty">
                          Không tìm thấy món ăn phù hợp
                        </div>
                      ) : (
                        filteredMenuOptions.map((item) => (
                          <div
                            className="combo-detail-option-item"
                            key={item.id}
                          >
                            <div className="combo-detail-option-item__left">
                              <div className="combo-detail-option-item__name">
                                {item.name}
                              </div>
                              <div className="combo-detail-option-item__meta">
                                {getMenuCategoryName(item)}
                              </div>
                            </div>

                            <div className="combo-detail-option-item__right">
                              <strong>
                                {formatPrice(toNumber(item.price))}
                              </strong>
                              <button
                                type="button"
                                onClick={() => addMenuById(item.id)}
                              >
                                + Thêm
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`combo-detail-picked-list ${
                    selectedMenus.length > 2 ? 'has-fade' : ''
                  }`}
                >
                  {selectedMenus.length === 0 ? (
                    <div className="combo-detail-empty">Chưa có món ăn nào</div>
                  ) : (
                    visibleMenus.map(renderSelectedMenuItem)
                  )}
                </div>

                {selectedMenus.length > 2 && (
                  <div className="combo-detail-view-all">
                    <button
                      type="button"
                      className="combo-detail-view-all__btn"
                      onClick={() => setMenuPopupOpen(true)}
                    >
                      Xem tất cả {selectedMenus.length} món
                    </button>
                  </div>
                )}
              </section>

              <section className="combo-detail-card">
                <div className="combo-detail-card__head">
                  <div>
                    <h2 className="combo-detail-card__title">Chọn dịch vụ</h2>
                    <p className="combo-detail-card__subtitle">
                      Tìm kiếm và thêm dịch vụ nhanh vào combo
                    </p>
                  </div>

                  <div className="combo-detail-counter">
                    {selectedServices.length} dịch vụ
                  </div>
                </div>

                <div className="combo-detail-picker" ref={serviceDropdownRef}>
                  <div className="combo-detail-toolbar combo-detail-toolbar--service">
                    <div className="combo-detail-search">
                      <span className="combo-detail-search__icon">⌕</span>
                      <input
                        value={serviceSearch}
                        onChange={(e) => {
                          setServiceSearch(e.target.value)
                          setServiceDropdownOpen(true)
                        }}
                        onFocus={() => setServiceDropdownOpen(true)}
                        placeholder="Tìm dịch vụ..."
                      />
                    </div>

                    <button
                      type="button"
                      className="combo-detail-toolbar__action"
                      onClick={() => setServiceDropdownOpen((prev) => !prev)}
                    >
                      {serviceDropdownOpen ? 'Đóng danh sách' : 'Mở danh sách'}
                    </button>
                  </div>

                  {serviceDropdownOpen && (
                    <div className="combo-detail-option-list">
                      {filteredServiceOptions.length === 0 ? (
                        <div className="combo-detail-option-list__empty">
                          Không tìm thấy dịch vụ phù hợp
                        </div>
                      ) : (
                        filteredServiceOptions.map((item) => (
                          <div
                            className="combo-detail-option-item"
                            key={item.id}
                          >
                            <div className="combo-detail-option-item__left">
                              <div className="combo-detail-option-item__name">
                                {item.name}
                              </div>
                              <div className="combo-detail-option-item__meta">
                                Dịch vụ
                              </div>
                            </div>

                            <div className="combo-detail-option-item__right">
                              <strong>
                                {formatPrice(toNumber(item.price))}
                              </strong>
                              <button
                                type="button"
                                onClick={() => addServiceById(item.id)}
                              >
                                + Thêm
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`combo-detail-picked-list ${
                    selectedServices.length > 2 ? 'has-fade' : ''
                  }`}
                >
                  {selectedServices.length === 0 ? (
                    <div className="combo-detail-empty">
                      Chưa có dịch vụ nào
                    </div>
                  ) : (
                    visibleServices.map(renderSelectedServiceItem)
                  )}
                </div>

                {selectedServices.length > 2 && (
                  <div className="combo-detail-view-all">
                    <button
                      type="button"
                      className="combo-detail-view-all__btn"
                      onClick={() => setServicePopupOpen(true)}
                    >
                      Xem tất cả {selectedServices.length} dịch vụ
                    </button>
                  </div>
                )}
              </section>
            </div>

            <aside className="combo-detail-side">
              <div className="combo-detail-summary-card">
                <div className="combo-detail-summary-card__head">
                  <div>
                    <h3>Tổng quan combo</h3>
                    <p>Cập nhật tự động theo lựa chọn hiện tại</p>
                  </div>
                </div>

                <div className="combo-detail-mini-stats">
                  <div className="combo-detail-mini-stat">
                    <span>Món ăn</span>
                    <strong>{selectedMenus.length}</strong>
                  </div>
                  <div className="combo-detail-mini-stat">
                    <span>Dịch vụ</span>
                    <strong>{selectedServices.length}</strong>
                  </div>
                </div>

                <div className="combo-detail-summary-list">
                  <div className="combo-detail-summary-row">
                    <span>Tổng giá món ăn</span>
                    <strong>{formatPrice(totalMenuPrice)}</strong>
                  </div>

                  <div className="combo-detail-summary-row">
                    <span>Tổng giá dịch vụ</span>
                    <strong>{formatPrice(totalServicePrice)}</strong>
                  </div>

                  <div className="combo-detail-summary-row">
                    <span>Tổng giá gốc</span>
                    <strong>{formatPrice(totalOriginPrice)}</strong>
                  </div>

                  <div className="combo-detail-summary-row">
                    <span>Giảm giá ({safeDiscountPercent}%)</span>
                    <strong className="is-discount">
                      - {formatPrice(discountAmount)}
                    </strong>
                  </div>
                </div>

                <div className="combo-detail-final-price">
                  <span>Giá bán combo</span>
                  <strong>{formatPrice(salePrice)}</strong>
                </div>

                <button
                  type="submit"
                  className="combo-detail-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                </button>
              </div>
            </aside>
          </form>
        </div>
      </div>

      {menuPopupOpen && (
        <div
          className="combo-detail-modal"
          onClick={() => setMenuPopupOpen(false)}
        >
          <div
            className="combo-detail-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="combo-detail-modal__header">
              <div>
                <h3>Tất cả món ăn đã chọn</h3>
                <p>{selectedMenus.length} món trong combo</p>
              </div>

              <button
                type="button"
                className="combo-detail-modal__close"
                onClick={() => setMenuPopupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="combo-detail-modal__body">
              {selectedMenus.map(renderSelectedMenuItem)}
            </div>
          </div>
        </div>
      )}

      {servicePopupOpen && (
        <div
          className="combo-detail-modal"
          onClick={() => setServicePopupOpen(false)}
        >
          <div
            className="combo-detail-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="combo-detail-modal__header">
              <div>
                <h3>Tất cả dịch vụ đã chọn</h3>
                <p>{selectedServices.length} dịch vụ trong combo</p>
              </div>

              <button
                type="button"
                className="combo-detail-modal__close"
                onClick={() => setServicePopupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="combo-detail-modal__body">
              {selectedServices.map(renderSelectedServiceItem)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
