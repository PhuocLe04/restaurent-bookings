'use client'

import 'animate.css'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import './page.css'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'

type Membership = {
  id: number
  code: string
  name: string
  discount_percent: number
}

type UserInfo = {
  id: number
  full_name: string
  email: string
  phone: string
  role: string
  member_point: number
  membership: Membership | null
  membership_discount_percent?: number
}

type ReservationTable = {
  table_id: number
  table_name: string
  capacity: number
  table_type: string | null
  table_type_description: string | null
}

type ReservationInfo = {
  id: number
  reservation_time: string | null
  reservation_endtime: string | null
  checked_in_at: string | null
  completed_at: string | null
  number_of_guests: number
  status: string
  tables: ReservationTable[]
}

type MenuItemRow = {
  menu_item_id: number
  name: string
  image: string | null
  category: string | null
  quantity: number
  original_unit_price?: number
  unit_price: number
  line_total: number
  is_available: boolean
}

type ServiceItemRow = {
  service_id: number
  name: string
  image: string | null
  description: string | null
  quantity: number
  original_unit_price?: number
  unit_price: number
  line_total: number
  is_active: boolean
  created_at: string | null
}

type PaymentRow = {
  id: number
  amount: number
  payment_method: string
  purpose: string
  status: string
  order_id: string
  request_id: string
  partner_transaction_id: string | null
  gateway_response: string | null
  created_at: string | null
  paid_at: string | null
}

type DepositInfo = {
  required: number
  paid_total: number
  pending_total: number
  remaining: number
  is_paid: boolean
  status: 'NOT_REQUIRED' | 'PAID' | 'PENDING' | 'UNPAID'
}

type ComboCandidate = {
  id: number
  title: string
  description: string | null
  total_origin_price: number
  sale_price: number
  discount_percent: number
  saving: number
  menu_items: {
    menu_item_id: number
    name: string
    quantity: number
    unit_price: number
  }[]
  service_items: {
    service_id: number
    name: string
    quantity: number
    unit_price: number
  }[]
}

type OrderDetailResponse = {
  id: number
  reservation_id: number
  user_id: number
  status: string
  grand_total: number
  deposit_required: number
  created_at: string | null
  preview_only?: boolean
  user: UserInfo
  reservation: ReservationInfo
  menu_items: MenuItemRow[]
  service_items: ServiceItemRow[]
  payments: PaymentRow[]
  deposit: DepositInfo
  combo_check?: {
    matched_count: number
    matched_combos: ComboCandidate[]
    current_combo_id?: number | null
    current_combo_saving?: number
    better_combo_available?: boolean
    better_combo_candidates?: ComboCandidate[]
    best_combo_id?: number | null
    selected_combo_id?: number | null
    combo_discount_amount?: number
  }
  summary?: {
    menu_total: number
    service_total: number
    original_total: number
    subtotal_before_combo?: number
    combo_discount_amount?: number
    after_combo_total: number
    member_discount_amount: number
    order_grand_total: number
    paid_total: number
    pending_total: number
    remaining_estimated: number
  }
}

type EditableMenu = {
  menu_item_id: number
  name: string
  quantity: number
  unit_price: number
  category: string | null
  image?: string | null
  isNew?: boolean
}

type EditableService = {
  service_id: number
  name: string
  quantity: number
  unit_price: number
  description: string | null
  image?: string | null
  isNew?: boolean
}

type SearchMenuItem = {
  id: number
  name: string
  price: number | string
  image?: string | null
  is_available?: boolean
  categories?: { id: number; name: string } | null
}

type SearchServiceItem = {
  id: number
  name: string
  price: number | string
  description?: string | null
  image?: string | null
  is_active?: boolean
}

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  key: number
}

function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value || 0)
  return `${n.toLocaleString('vi-VN')}₫`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN')
}

function getStatusClass(status?: string) {
  const s = String(status || '').toUpperCase()
  if (['SUCCESS', 'PAID', 'OPEN', 'CONFIRMED', 'COMPLETED'].includes(s)) {
    return 'is-success'
  }
  if (['PENDING', 'PROCESSING'].includes(s)) {
    return 'is-warning'
  }
  if (['CLOSED', 'CANCELLED', 'FAILED', 'UNPAID'].includes(s)) {
    return 'is-danger'
  }
  return 'is-default'
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function clampMinOne(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

function extractArray<T = any>(json: any): T[] {
  if (Array.isArray(json?.items)) return json.items
  if (Array.isArray(json?.services)) return json.services
  if (Array.isArray(json?.rows)) return json.rows
  if (Array.isArray(json?.data?.items)) return json.data.items
  if (Array.isArray(json?.data?.services)) return json.data.services
  if (Array.isArray(json?.data?.rows)) return json.data.rows
  if (Array.isArray(json?.data)) return json.data
  if (Array.isArray(json)) return json
  return []
}

function normalizeServiceSearchItems(input: any[]): SearchServiceItem[] {
  return input
    .map((item) => ({
      id: Number(item?.id ?? item?.service_id ?? 0),
      name: String(item?.name ?? item?.service_name ?? '').trim(),
      price: Number(item?.price ?? item?.unit_price ?? 0),
      description:
        typeof item?.description === 'string' ? item.description : null,
      image: item?.image ?? null,
      is_active:
        typeof item?.is_active === 'boolean' ? item.is_active : undefined,
    }))
    .filter((item) => item.id > 0 && item.name)
}

function normalizeMenuSearchItems(input: any[]): SearchMenuItem[] {
  return input
    .map((item) => ({
      id: Number(item?.id ?? item?.menu_item_id ?? 0),
      name: String(item?.name ?? '').trim(),
      price: Number(item?.price ?? item?.unit_price ?? 0),
      image: item?.image ?? null,
      is_available:
        typeof item?.is_available === 'boolean' ? item.is_available : undefined,
      categories: item?.categories
        ? {
            id: Number(item.categories?.id ?? 0),
            name: String(item.categories?.name ?? '').trim(),
          }
        : null,
    }))
    .filter((item) => item.id > 0 && item.name)
}

function SearchableDropdown<T extends { id: number; name: string }>({
  label,
  placeholder,
  open,
  setOpen,
  search,
  setSearch,
  loading,
  items,
  onSelect,
  renderMeta,
  emptyText,
  disabled = false,
}: {
  label: string
  placeholder: string
  open: boolean
  setOpen: (v: boolean) => void
  search: string
  setSearch: (v: string) => void
  loading: boolean
  items: T[]
  onSelect: (item: T) => void
  renderMeta?: (item: T) => React.ReactNode
  emptyText: string
  disabled?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }

    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, setOpen])

  return (
    <div className="smart-select" ref={wrapRef}>
      <label className="smart-select__label">{label}</label>

      <button
        type="button"
        className={`smart-select__trigger ${open ? 'open' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span>{placeholder}</span>
        <span className="smart-select__caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && !disabled && (
        <div className="smart-select__panel animate__animated animate__fadeIn">
          <div className="smart-select__search">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập để tìm kiếm..."
            />
          </div>

          <div className="smart-select__list">
            {loading ? (
              <div className="smart-select__empty">Đang tải dữ liệu...</div>
            ) : items.length === 0 ? (
              <div className="smart-select__empty">{emptyText}</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="smart-select__item"
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <div className="smart-select__item-main">
                    <strong>{item.name}</strong>
                    {renderMeta ? (
                      <span className="smart-select__item-meta">
                        {renderMeta(item)}
                      </span>
                    ) : null}
                  </div>

                  <span className="smart-select__item-add">+ Thêm</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const [data, setData] = useState<OrderDetailResponse | null>(null)
  const [previewData, setPreviewData] = useState<OrderDetailResponse | null>(
    null,
  )

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [comboApplying, setComboApplying] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN')
  const [menuRows, setMenuRows] = useState<EditableMenu[]>([])
  const [serviceRows, setServiceRows] = useState<EditableService[]>([])
  const [selectedComboId, setSelectedComboId] = useState<number | null>(null)
  const [appliedComboId, setAppliedComboId] = useState<number | null>(null)

  const [menuSearch, setMenuSearch] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('ALL')
  const [menuSearchLoading, setMenuSearchLoading] = useState(false)
  const [serviceSearchLoading, setServiceSearchLoading] = useState(false)
  const [menuSearchResults, setMenuSearchResults] = useState<SearchMenuItem[]>(
    [],
  )
  const [serviceSearchResults, setServiceSearchResults] = useState<
    SearchServiceItem[]
  >([])

  const [menuPopupOpen, setMenuPopupOpen] = useState(false)
  const [servicePopupOpen, setServicePopupOpen] = useState(false)
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false)
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false)

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
  })

  const previewReqRef = useRef(0)

  function showToast(type: MessageType, title: string, msg: string) {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message: msg,
      key: prev.key + 1,
    }))
  }

  function closeToast() {
    setToast((prev) => ({ ...prev, visible: false }))
  }

  function hydrateOrderState(json: OrderDetailResponse) {
    setData(json)
    setPreviewData(json)
    setStatus(json.status === 'CLOSED' ? 'CLOSED' : 'OPEN')

    setMenuRows(
      (json.menu_items || []).map((item) => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: clampMinOne(item.quantity || 1),
        unit_price: Number(item.original_unit_price ?? item.unit_price ?? 0),
        category: item.category,
        image: item.image,
      })),
    )

    setServiceRows(
      (json.service_items || []).map((item) => ({
        service_id: item.service_id,
        name: item.name,
        quantity: clampMinOne(item.quantity || 1),
        unit_price: Number(item.original_unit_price ?? item.unit_price ?? 0),
        description: item.description,
        image: item.image,
      })),
    )

    const currentComboId = json?.combo_check?.current_combo_id ?? null
    setAppliedComboId(currentComboId)
    setSelectedComboId(currentComboId)
  }

  async function loadDetail() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/admin/api/order/${id}`, {
        cache: 'no-store',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể tải chi tiết order')
      }

      hydrateOrderState(json)
    } catch (err: any) {
      const msg = err?.message || 'Có lỗi xảy ra'
      setError(msg)
      showToast('error', 'Lỗi tải dữ liệu', msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    loadDetail()
  }, [id])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMenuSearch(menuSearch)
    }, 250)
    return () => clearTimeout(timer)
  }, [menuSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setError('')
      fetchServiceSearch(serviceSearch)
    }, 250)
    return () => clearTimeout(timer)
  }, [serviceSearch])

  useEffect(() => {
    if (!id || !data) return
    const timer = setTimeout(() => {
      runPreview()
    }, 250)
    return () => clearTimeout(timer)
  }, [id, data, menuRows, serviceRows, status, selectedComboId])

  async function fetchMenuSearch(q: string) {
    try {
      setMenuSearchLoading(true)

      const keyword = encodeURIComponent(q || '')
      const urls = [
        `/admin/api/menu-items?q=${keyword}&limit=200`,
        `/admin/api/menu-items?search=${keyword}&limit=200`,
        `/admin/api/menu-items?keyword=${keyword}&limit=200`,
        `/api/admin/menu-items?q=${keyword}&limit=200`,
        `/api/admin/menu-items?search=${keyword}&limit=200`,
        `/api/admin/menu-items?keyword=${keyword}&limit=200`,
      ]

      let found: SearchMenuItem[] = []

      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' })
          const json = await res.json().catch(() => null)
          if (!res.ok) continue

          const rawItems = extractArray<any>(json)
          const normalized = normalizeMenuSearchItems(rawItems)

          if (normalized.length > 0 || q.trim() === '') {
            found = normalized
            break
          }
        } catch {}
      }

      setMenuSearchResults(found)
    } catch {
      setMenuSearchResults([])
    } finally {
      setMenuSearchLoading(false)
    }
  }

  async function fetchServiceSearch(q: string) {
    try {
      setServiceSearchLoading(true)

      const keyword = encodeURIComponent(q || '')
      const urls = [
        `/admin/api/reservation-services?q=${keyword}&limit=200`,
        `/admin/api/reservation-services?search=${keyword}&limit=200`,
        `/admin/api/reservation-services?keyword=${keyword}&limit=200`,
        `/api/admin/reservation-services?q=${keyword}&limit=200`,
        `/api/admin/reservation-services?search=${keyword}&limit=200`,
        `/api/admin/reservation-services?keyword=${keyword}&limit=200`,
      ]

      let found: SearchServiceItem[] = []
      let lastError = ''

      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' })
          const json = await res.json().catch(() => null)

          if (!res.ok) {
            lastError = json?.message || `Request failed: ${res.status}`
            continue
          }

          const rawItems = extractArray<any>(json)
          const normalized = normalizeServiceSearchItems(rawItems)

          if (normalized.length > 0 || q.trim() === '') {
            found = normalized
            break
          }
        } catch (err: any) {
          lastError = err?.message || 'Không thể tải dịch vụ'
        }
      }

      setServiceSearchResults(found)

      if (!found.length && q.trim()) {
        setError(lastError || 'Không lấy được danh sách dịch vụ')
      }
    } catch (err: any) {
      setServiceSearchResults([])
      setError(err?.message || 'Không lấy được danh sách dịch vụ')
    } finally {
      setServiceSearchLoading(false)
    }
  }

  async function runPreview(nextComboId?: number | null) {
    if (!data) return

    try {
      setPreviewLoading(true)
      setError('')
      const reqId = ++previewReqRef.current

      const res = await fetch(`/admin/api/order/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview_only: true,
          status,
          selected_combo_id:
            nextComboId !== undefined ? nextComboId : selectedComboId,
          menu_items: menuRows.map((item) => ({
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
          })),
          service_items: serviceRows.map((item) => ({
            service_id: item.service_id,
            quantity: item.quantity,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể preview order')
      }

      if (reqId !== previewReqRef.current) return
      setPreviewData(json?.data || null)
    } catch (err: any) {
      if (previewReqRef.current) setPreviewData(null)
      setError(err?.message || 'Không thể preview order')
    } finally {
      setPreviewLoading(false)
    }
  }

  function updateMenuQty(menuItemId: number, nextQty: number) {
    setMenuRows((prev) =>
      prev.map((item) =>
        item.menu_item_id === menuItemId
          ? { ...item, quantity: clampMinOne(nextQty) }
          : item,
      ),
    )
  }

  function updateServiceQty(serviceId: number, nextQty: number) {
    setServiceRows((prev) =>
      prev.map((item) =>
        item.service_id === serviceId
          ? { ...item, quantity: clampMinOne(nextQty) }
          : item,
      ),
    )
  }

  function removeMenuItem(menuItemId: number) {
    setMenuRows((prev) =>
      prev.filter((item) => item.menu_item_id !== menuItemId),
    )
  }

  function removeServiceItem(serviceId: number) {
    setServiceRows((prev) =>
      prev.filter((item) => item.service_id !== serviceId),
    )
  }

  function addMenuItem(item: SearchMenuItem) {
    const menuId = Number(item.id)

    setMenuRows((prev) => {
      const found = prev.find((x) => x.menu_item_id === menuId)
      if (found) {
        return prev.map((x) =>
          x.menu_item_id === menuId ? { ...x, quantity: x.quantity + 1 } : x,
        )
      }

      return [
        ...prev,
        {
          menu_item_id: menuId,
          name: item.name,
          quantity: 1,
          unit_price: Number(item.price || 0),
          category: item.categories?.name || null,
          image: item.image,
          isNew: true,
        },
      ]
    })

    const msg = 'Đã thêm món mới'
    setMessage(msg)
    showToast('success', 'Thêm món ăn', msg)
  }

  function addServiceItem(item: SearchServiceItem) {
    const serviceId = Number(item.id)

    setServiceRows((prev) => {
      const found = prev.find((x) => x.service_id === serviceId)
      if (found) {
        return prev.map((x) =>
          x.service_id === serviceId ? { ...x, quantity: x.quantity + 1 } : x,
        )
      }

      return [
        ...prev,
        {
          service_id: serviceId,
          name: item.name,
          quantity: 1,
          unit_price: Number(item.price || 0),
          description: item.description || null,
          image: item.image,
          isNew: true,
        },
      ]
    })

    const msg = 'Đã thêm dịch vụ mới'
    setMessage(msg)
    showToast('success', 'Thêm dịch vụ', msg)
  }

  function translatePaymentStatus(status: string) {
    switch (status) {
      case 'PENDING':
        return 'Chờ thanh toán'
      case 'SUCCESS':
        return 'Đã thanh toán'
      case 'FAILED':
        return 'Thất bại'
      case 'CANCELLED':
        return 'Đã hủy'
      default:
        return status
    }
  }

  function translatePaymentMethod(method: string) {
    switch (method) {
      case 'CASH':
        return 'Tiền mặt'
      case 'MOMO':
        return 'MoMo'
      case 'VNPAY':
        return 'VNPay'
      case 'BANK_TRANSFER':
        return 'Chuyển khoản'
      default:
        return method
    }
  }

  function translatePaymentPurpose(purpose: string) {
    switch (purpose) {
      case 'DEPOSIT':
        return 'Đặt cọc'
      case 'FINAL':
        return 'Thanh toán đợt cuối'
      default:
        return purpose
    }
  }

  function translateDepositStatus(status?: string) {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán'
      case 'UNPAID':
        return 'Chưa thanh toán'
      case 'NOT_REQUIRED':
        return 'Không yêu cầu đặt cọc'
      default:
        return status || 'Không xác định'
    }
  }

  const menuCategories = useMemo(() => {
    const set = new Set<string>()

    for (const item of menuSearchResults) {
      const name =
        typeof item.categories?.name === 'string'
          ? item.categories.name.trim()
          : ''
      if (name) set.add(name)
    }

    for (const item of menuRows) {
      const name = typeof item.category === 'string' ? item.category.trim() : ''
      if (name) set.add(name)
    }

    return ['ALL', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [menuSearchResults, menuRows])

  const filteredMenuSearchResults = useMemo(() => {
    const q = normalizeText(menuSearch)

    return menuSearchResults.filter((item) => {
      const itemName = normalizeText(item.name)
      const itemCategory = item.categories?.name || ''
      const normalizedCategory = normalizeText(itemCategory)
      const matchSearch =
        !q || itemName.includes(q) || normalizedCategory.includes(q)
      const matchCategory =
        menuCategoryFilter === 'ALL' || itemCategory === menuCategoryFilter

      return matchSearch && matchCategory && item.is_available !== false
    })
  }, [menuSearchResults, menuSearch, menuCategoryFilter])

  const filteredServiceSearchResults = useMemo(() => {
    const q = normalizeText(serviceSearch)

    return serviceSearchResults.filter((item) => {
      const matchText =
        !q ||
        normalizeText(item.name).includes(q) ||
        normalizeText(item.description).includes(q)

      const matchActive = item.is_active !== false
      return matchText && matchActive
    })
  }, [serviceSearchResults, serviceSearch])

  const liveData = previewData || data

  const liveMenuTotal = Number(liveData?.summary?.menu_total ?? 0)
  const liveServiceTotal = Number(liveData?.summary?.service_total ?? 0)

  const originalTotal = Number(
    liveData?.summary?.subtotal_before_combo ??
      liveData?.summary?.original_total ??
      liveMenuTotal + liveServiceTotal,
  )

  const liveComboDiscount = Number(
    liveData?.summary?.combo_discount_amount ??
      liveData?.combo_check?.combo_discount_amount ??
      0,
  )

  const afterComboPrice = Number(
    liveData?.summary?.after_combo_total ??
      Math.max(0, originalTotal - liveComboDiscount),
  )

  const membershipDiscount = Math.max(
    0,
    Number(
      liveData?.user?.membership_discount_percent ??
        data?.user?.membership_discount_percent ??
        data?.user?.membership?.discount_percent ??
        0,
    ),
  )

  const memberDiscountAmount = Number(
    liveData?.summary?.member_discount_amount ??
      (afterComboPrice * membershipDiscount) / 100,
  )

  const liveFinalTotal = Number(
    liveData?.summary?.order_grand_total ??
      liveData?.grand_total ??
      Math.max(0, afterComboPrice - memberDiscountAmount),
  )

  const liveDepositRequired = Number(
    liveData?.deposit_required ?? data?.deposit?.required ?? 0,
  )

  const matchedCombos =
    liveData?.combo_check?.matched_combos ||
    data?.combo_check?.matched_combos ||
    []

  const betterComboCandidates =
    liveData?.combo_check?.better_combo_candidates || []

  const memberPoint =
    Number(liveData?.user?.member_point ?? data?.user?.member_point ?? 0) || 0

  const depositPaidTotal = Number(data?.deposit?.paid_total || 0)
  const hasPaidDeposit = depositPaidTotal > 0

  const hasPaidFinal = (liveData?.payments || data?.payments || []).some(
    (payment) =>
      String(payment?.status || '').toUpperCase() === 'SUCCESS' &&
      String(payment?.purpose || '').toUpperCase() === 'FINAL',
  )

  const reservationStatus = String(
    data?.reservation?.status || '',
  ).toUpperCase()

  const isReservationLocked = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(
    reservationStatus,
  )

  const isOrderClosed = status === 'CLOSED'

  const canEditOrder = !isOrderClosed && !isReservationLocked

  const canShowPayment =
    !isOrderClosed &&
    !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservationStatus)

  const remainingOrderAmount = hasPaidFinal
    ? 0
    : hasPaidDeposit
      ? Math.max(0, liveFinalTotal - depositPaidTotal)
      : liveFinalTotal

  const visibleMenus = menuRows.slice(0, 3)
  const visibleServices = serviceRows.slice(0, 3)

  async function handleSave() {
    if (!canEditOrder) {
      const msg = 'Order không thể thao tác vì đã đóng hoặc đơn đã hoàn thành.'
      setError(msg)
      showToast('warning', 'Không thể chỉnh sửa', msg)
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')

      const payload = {
        status,
        selected_combo_id: selectedComboId,
        menu_items: menuRows.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
        })),
        service_items: serviceRows.map((item) => ({
          service_id: item.service_id,
          quantity: item.quantity,
        })),
      }

      const res = await fetch(`/admin/api/order/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.message || 'Không thể cập nhật order')
      }

      const msg = json?.message || 'Cập nhật order thành công'
      setMessage(msg)
      showToast('success', 'Cập nhật thành công', msg)

      if (json?.data) {
        hydrateOrderState(json.data as OrderDetailResponse)
      } else {
        await loadDetail()
      }
    } catch (err: any) {
      const msg = err?.message || 'Có lỗi xảy ra khi lưu'
      setError(msg)
      showToast('error', 'Lưu thất bại', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyCombo() {
    if (!canEditOrder) {
      const msg =
        'Không thể áp combo vì order đã đóng hoặc reservation đã COMPLETED.'
      setError(msg)
      showToast('warning', 'Không thể áp combo', msg)
      return
    }

    try {
      setComboApplying(true)
      setError('')
      setMessage('')

      await runPreview(selectedComboId)

      const msg = selectedComboId
        ? 'Đã áp combo vào bản xem trước. Hãy bấm Lưu thay đổi để ghi xuống order.'
        : 'Đã bỏ combo ở bản xem trước. Hãy bấm Lưu thay đổi để ghi xuống order.'

      setMessage(msg)
      showToast('success', 'Cập nhật combo', msg)
    } catch (err: any) {
      const msg = err?.message || 'Có lỗi khi áp combo'
      setError(msg)
      showToast('error', 'Áp combo thất bại', msg)
    } finally {
      setComboApplying(false)
    }
  }

  function handleGoPayment() {
    if (!canShowPayment) return
    router.push(`/admin/payments?order_id=${data?.id}`)
  }

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-shell">
          <div className="order-detail-loading-card">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-shell">
          <div className="order-alert danger">{error}</div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <>
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={closeToast}
        autoClose={3500}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
      />

      <div className="order-detail-page animate__animated animate__fadeIn">
        <div className="order-detail-shell">
          <div className="order-hero">
            <div className="order-hero__left">
              <h1 className="order-hero__title">Quản lý order #{data.id}</h1>
              <p className="order-hero__desc">
                Theo dõi chi tiết order, thêm món ăn, dịch vụ và thanh toán.
              </p>

              <div className="order-hero__chips">
                <div className="order-chip">
                  <span>Reservation</span>
                  <strong>#{data.reservation_id}</strong>
                </div>
                <div className="order-chip">
                  <span>User</span>
                  <strong>{data.user?.full_name || '—'}</strong>
                </div>
                <div className="order-chip">
                  <span>Trạng thái</span>
                  <strong>{status}</strong>
                </div>
                <div className="order-chip">
                  <span>Reservation</span>
                  <strong>{data.reservation?.status || '—'}</strong>
                </div>
              </div>
            </div>

            <div className="order-hero__right">
              <span
                className={`order-detail-status-pill ${
                  status === 'OPEN' ? 'on' : 'off'
                }`}
              >
                {status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
              </span>

              <Link href="/admin/order" className="order-detail-back-btn">
                Quay lại
              </Link>

              {canShowPayment && (
                <button
                  type="button"
                  className="order-payment-btn"
                  onClick={handleGoPayment}
                >
                  Thanh toán
                </button>
              )}

              {canEditOrder && (
                <button
                  type="button"
                  className="order-detail-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              )}
            </div>
          </div>

          {!!message && (
            <div className="order-alert success animate__animated animate__fadeInDown">
              {message}
            </div>
          )}

          {!!error && (
            <div className="order-alert danger animate__animated animate__fadeInDown">
              {error}
            </div>
          )}

          {!canEditOrder && (
            <div className="order-alert danger animate__animated animate__fadeInDown">
              Đơn hàng không thể thao tác vì đã đóng hoặc đơn hàng đã hoàn
              thành.
            </div>
          )}

          <div className="order-dashboard">
            <div className="order-summary-top">
              <div className="top-stat-card">
                <span>Tổng món ăn</span>
                <strong>{formatCurrency(liveMenuTotal)}</strong>
              </div>
              <div className="top-stat-card">
                <span>Tổng dịch vụ</span>
                <strong>{formatCurrency(liveServiceTotal)}</strong>
              </div>
              <div className="top-stat-card">
                <span>Giảm combo</span>
                <strong>- {formatCurrency(liveComboDiscount)}</strong>
              </div>
              <div className="top-stat-card highlight">
                <span>Giá cuối</span>
                <strong>{formatCurrency(liveFinalTotal)}</strong>
              </div>
            </div>

            <div className="order-detail-layout">
              <div className="order-detail-main">
                <section className="order-detail-card">
                  <div className="order-detail-card__head">
                    <div>
                      <h2 className="order-detail-card__title">
                        Thông tin order
                      </h2>
                      <p className="order-detail-card__subtitle">
                        Thông tin đơn, khách hàng và đặt bàn
                      </p>
                    </div>
                    <div className="order-detail-counter">#{data.id}</div>
                  </div>

                  <div className="order-detail-info-grid">
                    <div className="order-detail-field">
                      <label>Mã order</label>
                      <div className="order-detail-static">#{data.id}</div>
                    </div>

                    <div className="order-detail-field">
                      <label>Ngày tạo</label>
                      <div className="order-detail-static">
                        {formatDateTime(data.created_at)}
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Trạng thái order</label>
                      <select
                        className="order-detail-select"
                        value={status}
                        disabled={!canEditOrder}
                        onChange={(e) =>
                          setStatus(
                            e.target.value === 'CLOSED' ? 'CLOSED' : 'OPEN',
                          )
                        }
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>

                    <div className="order-detail-field">
                      <label>Tổng realtime</label>
                      <div className="order-detail-static is-highlight">
                        {formatCurrency(liveFinalTotal)}
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Khách hàng</label>
                      <div className="order-detail-static">
                        {data.user?.full_name || '—'}
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Số điện thoại</label>
                      <div className="order-detail-static">
                        {data.user?.phone || '—'}
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Email</label>
                      <div className="order-detail-static">
                        {data.user?.email || '—'}
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Membership</label>
                      <div className="order-detail-static">
                        {data.user?.membership?.name || 'Không có'}
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Ưu đãi member</label>
                      <div className="order-detail-static">
                        {membershipDiscount}% •{' '}
                        {memberPoint.toLocaleString('vi-VN')} điểm
                      </div>
                    </div>

                    <div className="order-detail-field">
                      <label>Thời gian đặt</label>
                      <div className="order-detail-static">
                        {formatDateTime(data.reservation?.reservation_time)}
                      </div>
                    </div>
                  </div>

                  <div className="order-detail-pill-list">
                    {(data.reservation?.tables || []).length > 0 ? (
                      data.reservation.tables.map((table) => (
                        <div key={table.table_id} className="order-detail-pill">
                          <strong>{table.table_name}</strong>
                          <span>
                            {table.table_type || 'Không rõ loại'} •{' '}
                            {table.capacity} chỗ
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="order-detail-empty">
                        Không có bàn trong reservation.
                      </div>
                    )}
                  </div>
                </section>

                <section className="order-detail-card">
                  <div className="editor-block__head">
                    <div>
                      <h2 className="order-detail-card__title">Chọn món ăn</h2>
                      <p className="order-detail-card__subtitle">
                        Dropdown tìm kiếm nhanh, lọc theo category và thêm trực
                        tiếp vào order
                      </p>
                    </div>

                    <div className="editor-block__head-right">
                      <select
                        className="order-detail-select order-detail-select--sm"
                        value={menuCategoryFilter}
                        disabled={!canEditOrder}
                        onChange={(e) => setMenuCategoryFilter(e.target.value)}
                      >
                        {menuCategories.map((category) => (
                          <option key={category} value={category}>
                            {category === 'ALL' ? 'Tất cả danh mục' : category}
                          </option>
                        ))}
                      </select>

                      <div className="order-detail-counter">
                        {menuRows.length} món
                      </div>
                    </div>
                  </div>

                  {canEditOrder ? (
                    <SearchableDropdown<SearchMenuItem>
                      label="Thêm món ăn"
                      placeholder="Chọn món ăn hoặc bấm để tìm kiếm"
                      open={menuDropdownOpen}
                      setOpen={setMenuDropdownOpen}
                      search={menuSearch}
                      setSearch={setMenuSearch}
                      loading={menuSearchLoading}
                      items={filteredMenuSearchResults}
                      onSelect={addMenuItem}
                      emptyText="Không tìm thấy món ăn phù hợp"
                      renderMeta={(item) =>
                        `${item.categories?.name || 'Không có danh mục'} • ${formatCurrency(
                          item.price,
                        )}`
                      }
                    />
                  ) : (
                    <div className="order-detail-note">
                      Đơn hàng không thể thao tác vì đã đóng hoặc đơn hàng đã
                      hoàn thành.
                    </div>
                  )}

                  <div className="picked-grid">
                    {menuRows.length === 0 ? (
                      <div className="order-detail-empty">
                        Order chưa có món ăn.
                      </div>
                    ) : (
                      visibleMenus.map((item) => (
                        <div
                          key={item.menu_item_id}
                          className="picked-modern-card"
                        >
                          <div className="picked-modern-card__top">
                            <div>
                              <h4>
                                {item.name}
                                {item.isNew ? (
                                  <span className="order-detail-tag">
                                    Mới thêm
                                  </span>
                                ) : null}
                              </h4>
                              <p>
                                {item.category || 'Không có danh mục'} •{' '}
                                {formatCurrency(item.unit_price)}
                              </p>
                            </div>

                            {canEditOrder && (
                              <button
                                type="button"
                                className="order-detail-remove-btn"
                                onClick={() =>
                                  removeMenuItem(item.menu_item_id)
                                }
                              >
                                Xóa
                              </button>
                            )}
                          </div>

                          <div className="picked-modern-card__bottom">
                            <div className="order-detail-price-chip">
                              <span>Thành tiền</span>
                              <strong>
                                {formatCurrency(
                                  item.quantity * item.unit_price,
                                )}
                              </strong>
                            </div>

                            <div className="order-detail-qty">
                              <button
                                type="button"
                                className="order-detail-qty__btn"
                                onClick={() =>
                                  updateMenuQty(
                                    item.menu_item_id,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={!canEditOrder || item.quantity <= 1}
                              >
                                −
                              </button>

                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                disabled={!canEditOrder}
                                onChange={(e) =>
                                  updateMenuQty(
                                    item.menu_item_id,
                                    Math.max(1, Number(e.target.value || 1)),
                                  )
                                }
                              />

                              <button
                                type="button"
                                className="order-detail-qty__btn"
                                onClick={() =>
                                  updateMenuQty(
                                    item.menu_item_id,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={!canEditOrder}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {menuRows.length > 3 && (
                    <div className="order-detail-view-all">
                      <button
                        type="button"
                        className="order-detail-view-all__btn"
                        onClick={() => setMenuPopupOpen(true)}
                      >
                        Xem tất cả {menuRows.length} món
                      </button>
                    </div>
                  )}
                </section>

                <section className="order-detail-card">
                  <div className="editor-block__head">
                    <div>
                      <h2 className="order-detail-card__title">Chọn dịch vụ</h2>
                      <p className="order-detail-card__subtitle">
                        Dropdown tìm kiếm dịch vụ và thêm nhanh vào order
                      </p>
                    </div>

                    <div className="order-detail-counter">
                      {serviceRows.length} dịch vụ
                    </div>
                  </div>

                  {canEditOrder ? (
                    <SearchableDropdown<SearchServiceItem>
                      label="Thêm dịch vụ"
                      placeholder="Chọn dịch vụ hoặc bấm để tìm kiếm"
                      open={serviceDropdownOpen}
                      setOpen={setServiceDropdownOpen}
                      search={serviceSearch}
                      setSearch={setServiceSearch}
                      loading={serviceSearchLoading}
                      items={filteredServiceSearchResults}
                      onSelect={addServiceItem}
                      emptyText="Không tìm thấy dịch vụ phù hợp"
                      renderMeta={(item) =>
                        `${item.description || 'Không có mô tả'} • ${formatCurrency(
                          item.price,
                        )}`
                      }
                    />
                  ) : (
                    <div className="order-detail-note">
                      Đơn hàng không thể thao tác vì đã đóng hoặc đơn hàng đã
                      hoàn thành.
                    </div>
                  )}

                  <div className="picked-grid">
                    {serviceRows.length === 0 ? (
                      <div className="order-detail-empty">
                        Order chưa có dịch vụ.
                      </div>
                    ) : (
                      visibleServices.map((item) => (
                        <div
                          key={item.service_id}
                          className="picked-modern-card"
                        >
                          <div className="picked-modern-card__top">
                            <div>
                              <h4>
                                {item.name}
                                {item.isNew ? (
                                  <span className="order-detail-tag">
                                    Mới thêm
                                  </span>
                                ) : null}
                              </h4>
                              <p>
                                {item.description || 'Không có mô tả'} •{' '}
                                {formatCurrency(item.unit_price)}
                              </p>
                            </div>

                            {canEditOrder && (
                              <button
                                type="button"
                                className="order-detail-remove-btn"
                                onClick={() =>
                                  removeServiceItem(item.service_id)
                                }
                              >
                                Xóa
                              </button>
                            )}
                          </div>

                          <div className="picked-modern-card__bottom">
                            <div className="order-detail-price-chip">
                              <span>Thành tiền</span>
                              <strong>
                                {formatCurrency(
                                  item.quantity * item.unit_price,
                                )}
                              </strong>
                            </div>

                            <div className="order-detail-qty">
                              <button
                                type="button"
                                className="order-detail-qty__btn"
                                onClick={() =>
                                  updateServiceQty(
                                    item.service_id,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={!canEditOrder || item.quantity <= 1}
                              >
                                −
                              </button>

                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                disabled={!canEditOrder}
                                onChange={(e) =>
                                  updateServiceQty(
                                    item.service_id,
                                    Math.max(1, Number(e.target.value || 1)),
                                  )
                                }
                              />

                              <button
                                type="button"
                                className="order-detail-qty__btn"
                                onClick={() =>
                                  updateServiceQty(
                                    item.service_id,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={!canEditOrder}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {serviceRows.length > 3 && (
                    <div className="order-detail-view-all">
                      <button
                        type="button"
                        className="order-detail-view-all__btn"
                        onClick={() => setServicePopupOpen(true)}
                      >
                        Xem tất cả {serviceRows.length} dịch vụ
                      </button>
                    </div>
                  )}
                </section>

                <section className="order-detail-card">
                  <div className="order-detail-card__head">
                    <div>
                      <h2 className="order-detail-card__title">
                        Combo phù hợp
                      </h2>
                      <p className="order-detail-card__subtitle">
                        Chọn combo tốt nhất để giảm giá ngay trên preview
                      </p>
                    </div>
                  </div>

                  {betterComboCandidates.length > 0 ? (
                    <>
                      <div className="order-detail-note-box">
                        Có combo giảm tốt hơn combo hiện tại. Bạn có thể chọn và
                        áp dụng ngay.
                      </div>

                      <div className="order-detail-combo-list">
                        <label className="order-detail-combo-card">
                          <div className="order-detail-combo-radio">
                            <input
                              type="radio"
                              name="best-combo"
                              checked={selectedComboId === null}
                              disabled={!canEditOrder}
                              onChange={() => setSelectedComboId(null)}
                            />
                          </div>

                          <div className="order-detail-combo-body">
                            <div className="order-detail-combo-top">
                              <div>
                                <h4>Không áp combo</h4>
                                <p>Giữ giá gốc và chỉ áp giảm member.</p>
                              </div>
                            </div>
                          </div>
                        </label>

                        {betterComboCandidates.map((combo) => (
                          <label
                            key={combo.id}
                            className="order-detail-combo-card"
                          >
                            <div className="order-detail-combo-radio">
                              <input
                                type="radio"
                                name="best-combo"
                                checked={selectedComboId === combo.id}
                                disabled={!canEditOrder}
                                onChange={() => setSelectedComboId(combo.id)}
                              />
                            </div>

                            <div className="order-detail-combo-body">
                              <div className="order-detail-combo-top">
                                <div>
                                  <h4>{combo.title}</h4>
                                  <p>{combo.description || 'Không có mô tả'}</p>
                                </div>

                                <div className="order-detail-combo-saving">
                                  Tiết kiệm {formatCurrency(combo.saving)}
                                </div>
                              </div>

                              <div className="order-detail-combo-prices">
                                <span>
                                  Gốc:{' '}
                                  {formatCurrency(combo.total_origin_price)}
                                </span>
                                <span>
                                  Combo: {formatCurrency(combo.sale_price)}
                                </span>
                                <span>
                                  % giảm: {combo.discount_percent || 0}%
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="order-detail-combo-action">
                        <button
                          type="button"
                          className="order-detail-secondary-btn"
                          disabled={comboApplying || !canEditOrder}
                          onClick={handleApplyCombo}
                        >
                          {comboApplying
                            ? 'Đang áp combo...'
                            : 'Áp dụng lựa chọn'}
                        </button>
                      </div>
                    </>
                  ) : matchedCombos.length > 0 ? (
                    <>
                      <div className="order-detail-combo-list">
                        <label className="order-detail-combo-card">
                          <div className="order-detail-combo-radio">
                            <input
                              type="radio"
                              name="combo-any"
                              checked={selectedComboId === null}
                              disabled={!canEditOrder}
                              onChange={() => setSelectedComboId(null)}
                            />
                          </div>

                          <div className="order-detail-combo-body">
                            <div className="order-detail-combo-top">
                              <div>
                                <h4>Không áp combo</h4>
                                <p>Giữ giá gốc và chỉ áp giảm member.</p>
                              </div>
                            </div>
                          </div>
                        </label>

                        {matchedCombos.map((combo) => (
                          <label
                            key={combo.id}
                            className="order-detail-combo-card"
                          >
                            <div className="order-detail-combo-radio">
                              <input
                                type="radio"
                                name="combo-any"
                                checked={selectedComboId === combo.id}
                                disabled={!canEditOrder}
                                onChange={() => setSelectedComboId(combo.id)}
                              />
                            </div>

                            <div className="order-detail-combo-body">
                              <div className="order-detail-combo-top">
                                <div>
                                  <h4>{combo.title}</h4>
                                  <p>{combo.description || 'Không có mô tả'}</p>
                                </div>

                                <div className="order-detail-combo-saving">
                                  Tiết kiệm {formatCurrency(combo.saving)}
                                </div>
                              </div>

                              <div className="order-detail-combo-prices">
                                <span>
                                  Gốc:{' '}
                                  {formatCurrency(combo.total_origin_price)}
                                </span>
                                <span>
                                  Combo: {formatCurrency(combo.sale_price)}
                                </span>
                                <span>
                                  % giảm: {combo.discount_percent || 0}%
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="order-detail-combo-action">
                        <button
                          type="button"
                          className="order-detail-secondary-btn"
                          disabled={comboApplying || !canEditOrder}
                          onClick={handleApplyCombo}
                        >
                          {comboApplying
                            ? 'Đang áp combo...'
                            : 'Áp dụng lựa chọn'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="order-detail-empty">
                      Hiện chưa có combo nào phù hợp với order này.
                    </div>
                  )}

                  {selectedComboId !== appliedComboId && (
                    <div className="order-detail-note">
                      Bạn đang thay đổi combo cho bản preview. Bấm “Lưu thay
                      đổi” để cập nhật order thật.
                    </div>
                  )}
                </section>

                <section className="order-detail-card">
                  <div className="order-detail-card__head">
                    <div>
                      <h2 className="order-detail-card__title">
                        Lịch sử thanh toán
                      </h2>
                      <p className="order-detail-card__subtitle">
                        Theo dõi các giao dịch đã phát sinh
                      </p>
                    </div>
                  </div>

                  {(data.payments || []).length > 0 ? (
                    <div className="order-detail-payment-wrap">
                      <table className="order-detail-payment-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Số tiền</th>
                            <th style={{ width: '140px' }}>Phương thức</th>
                            <th>Mục đích</th>
                            <th>Trạng thái</th>
                            <th>Thanh toán lúc</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.payments.map((payment) => (
                            <tr key={payment.id}>
                              <td>#{payment.id}</td>
                              <td>{formatCurrency(payment.amount)}</td>
                              <td>
                                {translatePaymentMethod(payment.payment_method)}
                              </td>
                              <td>
                                {translatePaymentPurpose(payment.purpose)}
                              </td>
                              <td>
                                <span
                                  className={`order-detail-status-badge ${getStatusClass(
                                    payment.status,
                                  )}`}
                                >
                                  {translatePaymentStatus(payment.status)}
                                </span>
                              </td>
                              <td>{formatDateTime(payment.paid_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="order-detail-empty">
                      Chưa có lịch sử thanh toán.
                    </div>
                  )}
                </section>
              </div>

              <aside className="order-detail-side">
                <div className="order-detail-summary-card">
                  <div className="order-detail-summary-card__head">
                    <div>
                      <h3>Tổng quan order</h3>
                    </div>
                  </div>

                  <div className="order-detail-mini-stats">
                    <div className="order-detail-mini-stat">
                      <span>Món ăn</span>
                      <strong>{menuRows.length}</strong>
                    </div>
                    <div className="order-detail-mini-stat">
                      <span>Dịch vụ</span>
                      <strong>{serviceRows.length}</strong>
                    </div>
                  </div>

                  <div className="order-detail-summary-list">
                    <div className="order-detail-summary-row">
                      <span>Tổng món ăn</span>
                      <strong>{formatCurrency(liveMenuTotal)}</strong>
                    </div>

                    <div className="order-detail-summary-row">
                      <span>Tổng dịch vụ</span>
                      <strong>{formatCurrency(liveServiceTotal)}</strong>
                    </div>

                    <div className="order-detail-summary-row">
                      <span>Giá gốc</span>
                      <strong>{formatCurrency(originalTotal)}</strong>
                    </div>

                    <div className="order-detail-summary-row">
                      <span>Giảm combo</span>
                      <strong className="is-discount">
                        - {formatCurrency(liveComboDiscount)}
                      </strong>
                    </div>

                    <div className="order-detail-summary-row">
                      <span>Giá sau combo</span>
                      <strong>{formatCurrency(afterComboPrice)}</strong>
                    </div>

                    <div className="order-detail-summary-row">
                      <span>Giảm member ({membershipDiscount}%)</span>
                      <strong className="is-discount">
                        - {formatCurrency(memberDiscountAmount)}
                      </strong>
                    </div>
                  </div>

                  <div className="order-detail-final-price">
                    <span>Giá cuối</span>
                    <strong>{formatCurrency(liveFinalTotal)}</strong>
                  </div>

                  <div className="order-detail-deposit-box">
                    <div className="order-detail-deposit-item">
                      <span>Cần cọc</span>
                      <strong>{formatCurrency(liveDepositRequired)}</strong>
                    </div>
                    <div className="order-detail-deposit-item">
                      <span>Đã thanh toán cọc</span>
                      <strong>{formatCurrency(depositPaidTotal)}</strong>
                    </div>
                    <div className="order-detail-deposit-item">
                      <span>Đang chờ</span>
                      <strong>
                        {formatCurrency(data.deposit?.pending_total)}
                      </strong>
                    </div>
                    <div className="order-detail-deposit-item">
                      <span>Phần còn lại trong order</span>
                      <strong>
                        {' '}
                        {hasPaidFinal
                          ? 'Đã thanh toán'
                          : formatCurrency(remainingOrderAmount)}
                      </strong>
                    </div>
                    <div className="order-detail-deposit-item">
                      <span>Kết quả</span>
                      <strong
                        className={`order-detail-status-badge ${getStatusClass(
                          liveData?.deposit?.status || data.deposit?.status,
                        )}`}
                      >
                        {translateDepositStatus(
                          liveData?.deposit?.status || data.deposit?.status,
                        )}
                      </strong>
                    </div>
                  </div>

                  {previewLoading && (
                    <div className="order-detail-note">
                      Đang cập nhật preview realtime...
                    </div>
                  )}

                  <div className="summary-actions">
                    {canShowPayment && (
                      <button
                        type="button"
                        className="order-payment-btn"
                        onClick={handleGoPayment}
                      >
                        Thanh toán ngay
                      </button>
                    )}

                    {canEditOrder && (
                      <button
                        type="button"
                        className="order-detail-submit-btn"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {menuPopupOpen && (
        <div
          className="order-detail-modal"
          onClick={() => setMenuPopupOpen(false)}
        >
          <div
            className="order-detail-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-detail-modal__header">
              <div>
                <h3>Tất cả món ăn đã chọn</h3>
                <p>{menuRows.length} món trong order</p>
              </div>

              <button
                type="button"
                className="order-detail-modal__close"
                onClick={() => setMenuPopupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="order-detail-modal__body">
              {menuRows.map((item) => (
                <div key={item.menu_item_id} className="picked-modern-card">
                  <div className="picked-modern-card__top">
                    <div>
                      <h4>{item.name}</h4>
                      <p>
                        {item.category || 'Không có danh mục'} •{' '}
                        {formatCurrency(item.unit_price)}
                      </p>
                    </div>

                    {canEditOrder && (
                      <button
                        type="button"
                        className="order-detail-remove-btn"
                        onClick={() => removeMenuItem(item.menu_item_id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  <div className="picked-modern-card__bottom">
                    <div className="order-detail-price-chip">
                      <span>Thành tiền</span>
                      <strong>
                        {formatCurrency(item.quantity * item.unit_price)}
                      </strong>
                    </div>

                    <div className="order-detail-qty">
                      <button
                        type="button"
                        className="order-detail-qty__btn"
                        onClick={() =>
                          updateMenuQty(item.menu_item_id, item.quantity - 1)
                        }
                        disabled={!canEditOrder || item.quantity <= 1}
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        disabled={!canEditOrder}
                        onChange={(e) =>
                          updateMenuQty(
                            item.menu_item_id,
                            Math.max(1, Number(e.target.value || 1)),
                          )
                        }
                      />

                      <button
                        type="button"
                        className="order-detail-qty__btn"
                        onClick={() =>
                          updateMenuQty(item.menu_item_id, item.quantity + 1)
                        }
                        disabled={!canEditOrder}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {servicePopupOpen && (
        <div
          className="order-detail-modal"
          onClick={() => setServicePopupOpen(false)}
        >
          <div
            className="order-detail-modal__dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-detail-modal__header">
              <div>
                <h3>Tất cả dịch vụ đã chọn</h3>
                <p>{serviceRows.length} dịch vụ trong order</p>
              </div>

              <button
                type="button"
                className="order-detail-modal__close"
                onClick={() => setServicePopupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="order-detail-modal__body">
              {serviceRows.map((item) => (
                <div key={item.service_id} className="picked-modern-card">
                  <div className="picked-modern-card__top">
                    <div>
                      <h4>{item.name}</h4>
                      <p>
                        {item.description || 'Không có mô tả'} •{' '}
                        {formatCurrency(item.unit_price)}
                      </p>
                    </div>

                    {canEditOrder && (
                      <button
                        type="button"
                        className="order-detail-remove-btn"
                        onClick={() => removeServiceItem(item.service_id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  <div className="picked-modern-card__bottom">
                    <div className="order-detail-price-chip">
                      <span>Thành tiền</span>
                      <strong>
                        {formatCurrency(item.quantity * item.unit_price)}
                      </strong>
                    </div>

                    <div className="order-detail-qty">
                      <button
                        type="button"
                        className="order-detail-qty__btn"
                        onClick={() =>
                          updateServiceQty(item.service_id, item.quantity - 1)
                        }
                        disabled={!canEditOrder || item.quantity <= 1}
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        disabled={!canEditOrder}
                        onChange={(e) =>
                          updateServiceQty(
                            item.service_id,
                            Math.max(1, Number(e.target.value || 1)),
                          )
                        }
                      />

                      <button
                        type="button"
                        className="order-detail-qty__btn"
                        onClick={() =>
                          updateServiceQty(item.service_id, item.quantity + 1)
                        }
                        disabled={!canEditOrder}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
