'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
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

export default function CreateComboPage() {
  const router = useRouter()

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
    let active = true

    async function loadData() {
      try {
        setLoadingData(true)

        const [menuRes, serviceRes] = await Promise.all([
          fetch('/admin/api/menu-items?limit=1000', { cache: 'no-store' }),
          fetch('/admin/api/reservation-services?limit=1000', {
            cache: 'no-store',
          }),
        ])

        const menuJson = await menuRes.json().catch(() => ({}))
        const serviceJson = await serviceRes.json().catch(() => ({}))

        if (!menuRes.ok) {
          throw new Error(menuJson.message || 'Không tải được danh sách món ăn')
        }

        if (!serviceRes.ok) {
          throw new Error(
            serviceJson.message || 'Không tải được danh sách dịch vụ',
          )
        }

        if (!active) return

        setMenuOptions(Array.isArray(menuJson.items) ? menuJson.items : [])
        setServiceOptions(
          Array.isArray(serviceJson.items) ? serviceJson.items : [],
        )
      } catch (err: any) {
        if (!active) return
        showToast('error', 'Lỗi tải dữ liệu', err?.message || 'Có lỗi xảy ra')
      } finally {
        if (active) setLoadingData(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

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
    const next = clampPercent(safeDiscountPercent - 1)
    setDiscountInput(String(next))
  }

  function increaseDiscount() {
    const next = clampPercent(safeDiscountPercent + 1)
    setDiscountInput(String(next))
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
      showToast('info', 'Đang tạo combo', 'Hệ thống đang xử lý dữ liệu', true)

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

      const res = await fetch('/admin/api/combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json.message || 'Tạo combo thất bại')
      }

      showToast(
        'success',
        'Tạo combo thành công',
        json.message || 'Combo đã được tạo thành công',
      )

      setTimeout(() => {
        router.push('/admin/combo')
      }, 900)
    } catch (err: any) {
      showToast('error', 'Tạo combo thất bại', err?.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  function renderSelectedMenuItem(item: SelectedMenu) {
    const itemTotal = item.unit_price * item.quantity
    const itemSale = Math.round(itemTotal * (1 - safeDiscountPercent / 100))

    return (
      <div className="combo-create-picked-card" key={item.menu_item_id}>
        <div className="combo-create-picked-card__main">
          <div className="combo-create-picked-card__title-wrap">
            <div className="combo-create-picked-card__title">{item.name}</div>
            <div className="combo-create-picked-card__sub">
              Giá gốc: {formatPrice(item.unit_price)} / món
            </div>
          </div>

          <button
            type="button"
            className="combo-create-remove-btn"
            onClick={() => removeMenu(item.menu_item_id)}
          >
            Xóa
          </button>
        </div>

        <div className="combo-create-picked-card__bottom">
          <div className="combo-create-picked-card__prices">
            <div className="combo-create-price-chip">
              <span>Thành tiền</span>
              <strong>{formatPrice(itemTotal)}</strong>
            </div>
            <div className="combo-create-price-chip combo-create-price-chip--sale">
              <span>Sau giảm</span>
              <strong>{formatPrice(itemSale)}</strong>
            </div>
          </div>

          <div className="combo-create-qty">
            <button
              type="button"
              className="combo-create-qty__btn"
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
              className="combo-create-qty__btn"
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
      <div className="combo-create-picked-card" key={item.service_id}>
        <div className="combo-create-picked-card__main">
          <div className="combo-create-picked-card__title-wrap">
            <div className="combo-create-picked-card__title">{item.name}</div>
            <div className="combo-create-picked-card__sub">
              Giá gốc: {formatPrice(item.unit_price)} / dịch vụ
            </div>
          </div>

          <button
            type="button"
            className="combo-create-remove-btn"
            onClick={() => removeService(item.service_id)}
          >
            Xóa
          </button>
        </div>

        <div className="combo-create-picked-card__bottom">
          <div className="combo-create-picked-card__prices">
            <div className="combo-create-price-chip">
              <span>Thành tiền</span>
              <strong>{formatPrice(itemTotal)}</strong>
            </div>
            <div className="combo-create-price-chip combo-create-price-chip--sale">
              <span>Sau giảm</span>
              <strong>{formatPrice(itemSale)}</strong>
            </div>
          </div>

          <div className="combo-create-qty">
            <button
              type="button"
              className="combo-create-qty__btn"
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
              className="combo-create-qty__btn"
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
      <div className="combo-create-page">
        <LiquidGlassMessage
          type={toast.type}
          title={toast.title}
          message={toast.message}
          isVisible={toast.visible}
          onClose={closeToast}
          toastKey={toast.key}
          loading={toast.loading}
        />

        <div className="combo-create-shell">
          <div className="combo-create-loading-card">Đang tải dữ liệu...</div>
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

      <div className="combo-create-page">
        <div className="combo-create-shell">
          <div className="combo-create-hero">
            <div className="combo-create-hero__glow combo-create-hero__glow--1" />
            <div className="combo-create-hero__glow combo-create-hero__glow--2" />

            <div className="combo-create-hero__content">
              <h1 className="combo-create-hero__title">Tạo combo ưu đãi</h1>
              <p className="combo-create-hero__subtitle">
                Kết hợp nhiều món ăn và dịch vụ trong cùng một combo, thiết lập
                giảm giá và xem giá bán.
              </p>
            </div>

            <div className="combo-create-hero__actions">
              <span
                className={`combo-create-status-pill ${isActive ? 'on' : 'off'}`}
              >
                {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
              </span>

              <Link href="/admin/combo" className="combo-create-back-btn">
                Quay lại
              </Link>
            </div>
          </div>

          <form className="combo-create-layout" onSubmit={handleSubmit}>
            <div className="combo-create-main">
              <section className="combo-create-card">
                <div className="combo-create-card__head">
                  <div>
                    <h2 className="combo-create-card__title">
                      Thông tin combo
                    </h2>
                    <p className="combo-create-card__subtitle">
                      Thiết lập thông tin cơ bản trước khi chọn món và dịch vụ
                    </p>
                  </div>
                </div>

                <div className="combo-create-field">
                  <label>Tên combo</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Combo sinh nhật VIP"
                  />
                </div>

                <div className="combo-create-field">
                  <label>Mô tả</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả ngắn cho combo"
                    rows={4}
                  />
                </div>

                <div className="combo-create-info-grid">
                  <div className="combo-create-field">
                    <label>Giảm giá (%)</label>

                    <div className="combo-create-discount-box">
                      <button
                        type="button"
                        className="combo-create-discount-box__btn"
                        onClick={decreaseDiscount}
                        disabled={safeDiscountPercent <= 0}
                      >
                        −
                      </button>

                      <div className="combo-create-discount-box__input">
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
                        className="combo-create-discount-box__btn"
                        onClick={increaseDiscount}
                        disabled={safeDiscountPercent >= 100}
                      >
                        +
                      </button>
                    </div>

                    <div className="combo-create-helper">
                      {discountFocused && discountInput === ''
                        ? 'Nhập phần trăm giảm giá từ 0 đến 100'
                        : `Giảm tối đa 100% • hiện tại ${safeDiscountPercent}%`}
                    </div>
                  </div>

                  <div className="combo-create-field">
                    <label>Trạng thái</label>

                    <div className="combo-create-state-card">
                      <button
                        type="button"
                        className={`combo-create-switch ${isActive ? 'active' : ''}`}
                        onClick={() => setIsActive((prev) => !prev)}
                      >
                        <span className="combo-create-switch__thumb" />
                      </button>

                      <div className="combo-create-state-card__text">
                        <strong>
                          {isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                        </strong>
                        <span>
                          {isActive
                            ? 'Combo có thể hiển thị và sử dụng'
                            : 'Combo tạm bị ẩn khỏi hệ thống'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="combo-create-card">
                <div className="combo-create-card__head">
                  <div>
                    <h2 className="combo-create-card__title">Chọn món ăn</h2>
                    <p className="combo-create-card__subtitle">
                      Tìm kiếm theo tên món hoặc lọc theo danh mục
                    </p>
                  </div>

                  <div className="combo-create-counter">
                    {selectedMenus.length} món
                  </div>
                </div>

                <div className="combo-create-picker" ref={menuDropdownRef}>
                  <div className="combo-create-toolbar">
                    <div className="combo-create-search">
                      <span className="combo-create-search__icon">⌕</span>
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
                      className="combo-create-toolbar__action"
                      onClick={() => setMenuDropdownOpen((prev) => !prev)}
                    >
                      {menuDropdownOpen ? 'Đóng danh sách' : 'Mở danh sách'}
                    </button>
                  </div>

                  {menuDropdownOpen && (
                    <div className="combo-create-option-list">
                      {filteredMenuOptions.length === 0 ? (
                        <div className="combo-create-option-list__empty">
                          Không tìm thấy món ăn phù hợp
                        </div>
                      ) : (
                        filteredMenuOptions.map((item) => (
                          <div
                            className="combo-create-option-item"
                            key={item.id}
                          >
                            <div className="combo-create-option-item__left">
                              <div className="combo-create-option-item__name">
                                {item.name}
                              </div>
                              <div className="combo-create-option-item__meta">
                                {getMenuCategoryName(item)}
                              </div>
                            </div>

                            <div className="combo-create-option-item__right">
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
                  className={`combo-create-picked-list ${
                    selectedMenus.length > 2 ? 'has-fade' : ''
                  }`}
                >
                  {selectedMenus.length === 0 ? (
                    <div className="combo-create-empty">Chưa có món ăn nào</div>
                  ) : (
                    visibleMenus.map(renderSelectedMenuItem)
                  )}
                </div>

                {selectedMenus.length > 2 && (
                  <div className="combo-create-view-all">
                    <button
                      type="button"
                      className="combo-create-view-all__btn"
                      onClick={() => setMenuPopupOpen(true)}
                    >
                      Xem tất cả {selectedMenus.length} món
                    </button>
                  </div>
                )}
              </section>

              <section className="combo-create-card">
                <div className="combo-create-card__head">
                  <div>
                    <h2 className="combo-create-card__title">Chọn dịch vụ</h2>
                    <p className="combo-create-card__subtitle">
                      Tìm kiếm và thêm dịch vụ nhanh vào combo
                    </p>
                  </div>

                  <div className="combo-create-counter">
                    {selectedServices.length} dịch vụ
                  </div>
                </div>

                <div className="combo-create-picker" ref={serviceDropdownRef}>
                  <div className="combo-create-toolbar combo-create-toolbar--service">
                    <div className="combo-create-search">
                      <span className="combo-create-search__icon">⌕</span>
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
                      className="combo-create-toolbar__action"
                      onClick={() => setServiceDropdownOpen((prev) => !prev)}
                    >
                      {serviceDropdownOpen ? 'Đóng danh sách' : 'Mở danh sách'}
                    </button>
                  </div>

                  {serviceDropdownOpen && (
                    <div className="combo-create-option-list">
                      {filteredServiceOptions.length === 0 ? (
                        <div className="combo-create-option-list__empty">
                          Không tìm thấy dịch vụ phù hợp
                        </div>
                      ) : (
                        filteredServiceOptions.map((item) => (
                          <div
                            className="combo-create-option-item"
                            key={item.id}
                          >
                            <div className="combo-create-option-item__left">
                              <div className="combo-create-option-item__name">
                                {item.name}
                              </div>
                              <div className="combo-create-option-item__meta">
                                Dịch vụ
                              </div>
                            </div>

                            <div className="combo-create-option-item__right">
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
                  className={`combo-create-picked-list ${
                    selectedServices.length > 2 ? 'has-fade' : ''
                  }`}
                >
                  {selectedServices.length === 0 ? (
                    <div className="combo-create-empty">
                      Chưa có dịch vụ nào
                    </div>
                  ) : (
                    visibleServices.map(renderSelectedServiceItem)
                  )}
                </div>

                {selectedServices.length > 2 && (
                  <div className="combo-create-view-all">
                    <button
                      type="button"
                      className="combo-create-view-all__btn"
                      onClick={() => setServicePopupOpen(true)}
                    >
                      Xem tất cả {selectedServices.length} dịch vụ
                    </button>
                  </div>
                )}
              </section>
            </div>

            <aside className="combo-create-side">
              <div className="combo-create-summary-card">
                <div className="combo-create-summary-card__head">
                  <div>
                    <h3>Tổng quan combo</h3>
                    <p>Cập nhật tự động theo lựa chọn hiện tại</p>
                  </div>
                </div>

                <div className="combo-create-mini-stats">
                  <div className="combo-create-mini-stat">
                    <span>Món ăn</span>
                    <strong>{selectedMenus.length}</strong>
                  </div>
                  <div className="combo-create-mini-stat">
                    <span>Dịch vụ</span>
                    <strong>{selectedServices.length}</strong>
                  </div>
                </div>

                <div className="combo-create-summary-list">
                  <div className="combo-create-summary-row">
                    <span>Tổng giá món ăn</span>
                    <strong>{formatPrice(totalMenuPrice)}</strong>
                  </div>

                  <div className="combo-create-summary-row">
                    <span>Tổng giá dịch vụ</span>
                    <strong>{formatPrice(totalServicePrice)}</strong>
                  </div>

                  <div className="combo-create-summary-row">
                    <span>Tổng giá gốc</span>
                    <strong>{formatPrice(totalOriginPrice)}</strong>
                  </div>

                  <div className="combo-create-summary-row">
                    <span>Giảm giá ({safeDiscountPercent}%)</span>
                    <strong className="is-discount">
                      - {formatPrice(discountAmount)}
                    </strong>
                  </div>
                </div>

                <div className="combo-create-final-price">
                  <span>Giá bán combo</span>
                  <strong>{formatPrice(salePrice)}</strong>
                </div>

                <button
                  type="submit"
                  className="combo-create-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo combo'}
                </button>
              </div>
            </aside>
          </form>
        </div>
      </div>

      {menuPopupOpen && (
        <div
          className="combo-create-modal"
          onClick={() => setMenuPopupOpen(false)}
        >
          <div
            className="combo-create-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="combo-create-modal__header">
              <div>
                <h3>Tất cả món ăn đã chọn</h3>
                <p>{selectedMenus.length} món trong combo</p>
              </div>

              <button
                type="button"
                className="combo-create-modal__close"
                onClick={() => setMenuPopupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="combo-create-modal__body">
              {selectedMenus.map(renderSelectedMenuItem)}
            </div>
          </div>
        </div>
      )}

      {servicePopupOpen && (
        <div
          className="combo-create-modal"
          onClick={() => setServicePopupOpen(false)}
        >
          <div
            className="combo-create-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="combo-create-modal__header">
              <div>
                <h3>Tất cả dịch vụ đã chọn</h3>
                <p>{selectedServices.length} dịch vụ trong combo</p>
              </div>

              <button
                type="button"
                className="combo-create-modal__close"
                onClick={() => setServicePopupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="combo-create-modal__body">
              {selectedServices.map(renderSelectedServiceItem)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
