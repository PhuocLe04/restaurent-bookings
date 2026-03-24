'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReservationForm from './reservations-form'
import ComboSection from './reservations-combo'
import MenuSection from './reservations-menu'
import ServiceSection from './reservations-service'
import LiquidGlassMessage, {
  type MessageType,
} from '@/app/ui/LiquidGlassMessage'
import '../page.css'

export type TableType = {
  id: number
  name: string
  description?: string | null
}

export type Category = {
  id: number
  name: string
}

export type MenuItem = {
  id: number
  name: string
  price: number
  image: string | null
  category_id: number
  category: { id: number; name: string }
}

export type Service = {
  id: number
  name: string
  image: string | null
  description?: string | null
  price: number
}

export type Combo = {
  id: number
  title: string
  description?: string | null
  sale_price: number
  discount_percent?: number | null
  total_origin_price: number
}

export type ComboDetail = {
  id: number
  title: string
  description?: string | null
  sale_price: number
  discount_percent?: number | null
  total_origin_price: number
  combo_services: {
    service_id: number
    quantity: number
    unit_price: number
    services: { id: number; name: string; description?: string | null }
  }[]
  combo_menu_items: {
    menu_item_id: number
    quantity: number
    unit_price: number
    menu_items: {
      id: number
      name: string
      price: number
      image: string | null
    }
  }[]
}

export type CreateReservationResponse = {
  message: string
  table_ids?: number[]
  reservation?: any
  order?: any
  order_id?: number | null
  need_payment?: boolean
  payment_url?: string | null
  membership?: {
    id: number
    code: string
    name: string
    min_point: number
    discount_percent: number
  } | null
  pricing?: {
    subtotal: number
    membership_min_point: number
    membership_discount_percent: number
    discount_amount: number
    grand_total: number
    deposit_required: number
    free_deposit: boolean
  } | null
}

type ToastState = {
  visible: boolean
  type: MessageType
  title: string
  message: string
  key: number
  loading?: boolean
}

type QtyMap = Record<number, number>
type ComboDetailMap = Record<number, ComboDetail>

type OrderSummaryState = {
  subtotal: number
  membershipDiscountPercent: number
  discountAmount: number
  grandTotal: number
  depositRequired: number
  membershipName?: string | null
  membershipMinPoint?: number
  freeDeposit?: boolean
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toDatetimeLocalValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return null

  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const h = Number(m[4])
  const mi = Number(m[5])

  const dt = new Date(y, mo, d, h, mi, 0, 0)
  return isNaN(dt.getTime()) ? null : dt
}

export function toNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v?.toString?.() ?? v)
  return Number.isFinite(n) ? n : fallback
}

function normalizePositiveMap(input: QtyMap) {
  const out: QtyMap = {}
  for (const [k, v] of Object.entries(input)) {
    const id = Number(k)
    const qty = Number(v)
    if (id && qty > 0) out[id] = qty
  }
  return out
}

function buildComboIncludedMenuQty(
  appliedCombos: QtyMap,
  comboDetailsMap: ComboDetailMap,
) {
  const result: QtyMap = {}

  for (const [comboIdStr, comboQtyValue] of Object.entries(appliedCombos)) {
    const comboId = Number(comboIdStr)
    const comboQty = Number(comboQtyValue ?? 0)
    const detail = comboDetailsMap[comboId]

    if (!comboId || comboQty <= 0 || !detail) continue

    for (const item of detail.combo_menu_items ?? []) {
      const menuItemId = Number(item.menu_item_id)
      const qty = Number(item.quantity ?? 0) * comboQty
      if (!menuItemId || qty <= 0) continue
      result[menuItemId] = (result[menuItemId] ?? 0) + qty
    }
  }

  return result
}

function buildComboIncludedServiceQty(
  appliedCombos: QtyMap,
  comboDetailsMap: ComboDetailMap,
) {
  const result: QtyMap = {}

  for (const [comboIdStr, comboQtyValue] of Object.entries(appliedCombos)) {
    const comboId = Number(comboIdStr)
    const comboQty = Number(comboQtyValue ?? 0)
    const detail = comboDetailsMap[comboId]

    if (!comboId || comboQty <= 0 || !detail) continue

    for (const item of detail.combo_services ?? []) {
      const serviceId = Number(item.service_id)
      const qty = Number(item.quantity ?? 0) * comboQty
      if (!serviceId || qty <= 0) continue
      result[serviceId] = (result[serviceId] ?? 0) + qty
    }
  }

  return result
}

function subtractComboQty(
  current: QtyMap,
  prevMinMap: QtyMap,
  nextMinMap: QtyMap,
) {
  const next: QtyMap = { ...normalizePositiveMap(current) }

  const allIds = new Set<number>([
    ...Object.keys(prevMinMap).map(Number),
    ...Object.keys(nextMinMap).map(Number),
    ...Object.keys(next).map(Number),
  ])

  for (const id of allIds) {
    const prevMin = Number(prevMinMap[id] ?? 0)
    const nextMin = Number(nextMinMap[id] ?? 0)
    const currentQty = Number(next[id] ?? 0)

    if (currentQty <= 0) continue

    const diff = prevMin - nextMin
    if (diff <= 0) continue

    const newQty = Math.max(nextMin, currentQty - diff)

    if (newQty > 0) next[id] = newQty
    else delete next[id]
  }

  return next
}

export default function ReservationClient({
  userId,
  userName,
  membershipDiscountPercent = 0,
  membershipName = null,
  membershipMinPoint = 0,
}: {
  userId: number
  userName: string
  membershipDiscountPercent?: number
  membershipName?: string | null
  membershipMinPoint?: number
}) {
  const router = useRouter()

  const [guests, setGuests] = useState<number>(2)
  const [tableCount, setTableCount] = useState<number>(1)

  const [tableTypes, setTableTypes] = useState<TableType[]>([])
  const [tableTypeId, setTableTypeId] = useState<string>('1')

  const [now, setNow] = useState<Date>(() => new Date())
  const minDate = useMemo(() => new Date(now.getTime() + 60 * 60 * 1000), [now])
  const minTimeLocal = useMemo(() => toDatetimeLocalValue(minDate), [minDate])

  const [timeLocal, setTimeLocal] = useState<string>(() =>
    toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)),
  )
  const timeDate = useMemo(() => fromDatetimeLocal(timeLocal), [timeLocal])

  const [loadingCreate, setLoadingCreate] = useState(false)

  const [preorderFood, setPreorderFood] = useState<boolean>(false)
  const [enableServices, setEnableServices] = useState<boolean>(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [menuQuery, setMenuQuery] = useState<string>('')
  const [selectedItems, setSelectedItems] = useState<QtyMap>({})

  const [services, setServices] = useState<Service[]>([])
  const [serviceQuery, setServiceQuery] = useState<string>('')
  const [selectedServices, setSelectedServices] = useState<QtyMap>({})

  const [combos, setCombos] = useState<Combo[]>([])
  const [comboId, setComboId] = useState<string>('')
  const [comboDetail, setComboDetail] = useState<ComboDetail | null>(null)
  const [comboDetailsMap, setComboDetailsMap] = useState<ComboDetailMap>({})
  const [appliedCombos, setAppliedCombos] = useState<QtyMap>({})
  const [comboBusy, setComboBusy] = useState(false)

  const [orderSummary, setOrderSummary] = useState<OrderSummaryState | null>(
    null,
  )

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    key: 0,
    loading: false,
  })

  const showToast = (
    type: MessageType,
    title: string,
    message: string,
    options?: { loading?: boolean },
  ) => {
    setToast((prev) => ({
      visible: true,
      type,
      title,
      message,
      key: prev.key + 1,
      loading: options?.loading ?? false,
    }))
  }

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false, loading: false }))
  }

  const combosArray = useMemo(
    () =>
      Object.entries(appliedCombos)
        .map(([id, qty]) => ({
          combo_id: Number(id),
          quantity: Number(qty),
        }))
        .filter((x) => x.combo_id && x.quantity > 0),
    [appliedCombos],
  )

  const comboIncludedMenuQty = useMemo(
    () => buildComboIncludedMenuQty(appliedCombos, comboDetailsMap),
    [appliedCombos, comboDetailsMap],
  )

  const comboIncludedServiceQty = useMemo(
    () => buildComboIncludedServiceQty(appliedCombos, comboDetailsMap),
    [appliedCombos, comboDetailsMap],
  )

  const hasComboMenu = useMemo(
    () => Object.keys(comboIncludedMenuQty).length > 0,
    [comboIncludedMenuQty],
  )

  const hasComboService = useMemo(
    () => Object.keys(comboIncludedServiceQty).length > 0,
    [comboIncludedServiceQty],
  )

  const effectivePreorderFood = preorderFood || hasComboMenu
  const effectiveEnableServices = enableServices || hasComboService

  const isCurrentComboApplied = useMemo(() => {
    if (!comboDetail) return false
    return Number(appliedCombos[comboDetail.id] ?? 0) > 0
  }, [comboDetail, appliedCombos])

  useEffect(() => {
    if (hasComboMenu) setPreorderFood(true)
  }, [hasComboMenu])

  useEffect(() => {
    if (hasComboService) setEnableServices(true)
  }, [hasComboService])

  useEffect(() => {
    setSelectedItems((prev) => {
      const next = { ...normalizePositiveMap(prev) }

      for (const [idStr, minQtyValue] of Object.entries(comboIncludedMenuQty)) {
        const id = Number(idStr)
        const minQty = Number(minQtyValue ?? 0)
        const current = Number(next[id] ?? 0)
        if (current < minQty) next[id] = minQty
      }

      return next
    })
  }, [comboIncludedMenuQty])

  useEffect(() => {
    setSelectedServices((prev) => {
      const next = { ...normalizePositiveMap(prev) }

      for (const [idStr, minQtyValue] of Object.entries(
        comboIncludedServiceQty,
      )) {
        const id = Number(idStr)
        const minQty = Number(minQtyValue ?? 0)
        const current = Number(next[id] ?? 0)
        if (current < minQty) next[id] = minQty
      }

      return next
    })
  }, [comboIncludedServiceQty])

  const itemsArray = useMemo(
    () =>
      Object.entries(selectedItems)
        .map(([id, qty]) => ({
          menu_item_id: Number(id),
          quantity: Number(qty),
        }))
        .filter((x) => x.menu_item_id && x.quantity > 0),
    [selectedItems],
  )

  const servicesArray = useMemo(
    () =>
      Object.entries(selectedServices)
        .map(([id, qty]) => ({
          service_id: Number(id),
          quantity: Number(qty),
        }))
        .filter((x) => x.service_id && x.quantity > 0),
    [selectedServices],
  )

  const hasAnySelection = useMemo(() => {
    return (
      itemsArray.length > 0 ||
      servicesArray.length > 0 ||
      combosArray.length > 0
    )
  }, [itemsArray, servicesArray, combosArray])

  const previewSummary = useMemo<OrderSummaryState | null>(() => {
    if (!hasAnySelection) return null

    let comboTotal = 0
    for (const [comboIdStr, qtyValue] of Object.entries(appliedCombos)) {
      const comboId = Number(comboIdStr)
      const qty = Number(qtyValue ?? 0)
      const detail = comboDetailsMap[comboId]
      if (!comboId || qty <= 0 || !detail) continue
      comboTotal += toNumber(detail.sale_price, 0) * qty
    }

    let extraMenuTotal = 0
    for (const [itemIdStr, qtyValue] of Object.entries(selectedItems)) {
      const id = Number(itemIdStr)
      const qty = Number(qtyValue ?? 0)
      const coveredQty = Number(comboIncludedMenuQty[id] ?? 0)
      const extraQty = Math.max(0, qty - coveredQty)
      if (extraQty <= 0) continue

      const item = menuItems.find((x) => x.id === id)
      extraMenuTotal += toNumber(item?.price, 0) * extraQty
    }

    let extraServiceTotal = 0
    for (const [serviceIdStr, qtyValue] of Object.entries(selectedServices)) {
      const id = Number(serviceIdStr)
      const qty = Number(qtyValue ?? 0)
      const coveredQty = Number(comboIncludedServiceQty[id] ?? 0)
      const extraQty = Math.max(0, qty - coveredQty)
      if (extraQty <= 0) continue

      const service = services.find((x) => x.id === id)
      extraServiceTotal += toNumber(service?.price, 0) * extraQty
    }

    const subtotal = comboTotal + extraMenuTotal + extraServiceTotal
    const discountAmount = Math.round(
      subtotal * (Number(membershipDiscountPercent ?? 0) / 100),
    )
    const grandTotal = Math.max(0, subtotal - discountAmount)
    const isFreeDeposit = Number(membershipMinPoint ?? 0) >= 20000000
    const depositRequired =
      !isFreeDeposit && grandTotal > 0 ? Math.round(grandTotal * 0.5) : 0

    return {
      subtotal,
      membershipDiscountPercent: Number(membershipDiscountPercent ?? 0),
      discountAmount,
      grandTotal,
      depositRequired,
      membershipName,
      membershipMinPoint: Number(membershipMinPoint ?? 0),
      freeDeposit: isFreeDeposit,
    }
  }, [
    hasAnySelection,
    appliedCombos,
    comboDetailsMap,
    selectedItems,
    selectedServices,
    comboIncludedMenuQty,
    comboIncludedServiceQty,
    menuItems,
    services,
    membershipDiscountPercent,
    membershipName,
  ])

  const displayedSummary = orderSummary ?? previewSummary

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const res = await fetch('/api/table-type')
        if (!res.ok) {
          console.error('GET /api/table-type failed:', res.status)
          return
        }

        const data = (await res.json()) as { types?: TableType[] }
        if (!mounted) return

        setTableTypes(Array.isArray(data.types) ? data.types : [])
      } catch (e) {
        console.error('load table types error:', e)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch('/api/combos'),
          fetch('/api/reservation-services'),
        ])

        if (mounted) {
          if (!cRes.ok) {
            console.error('GET /api/combos failed:', cRes.status)
          } else {
            const data = (await cRes.json()) as { combos?: any[] }
            const safe = Array.isArray(data.combos) ? data.combos : []

            setCombos(
              safe.map((c) => ({
                id: Number(c.id),
                title: String(c.title ?? ''),
                description: c.description ?? null,
                sale_price: toNumber(c.sale_price, 0),
                discount_percent:
                  c.discount_percent == null
                    ? null
                    : toNumber(c.discount_percent, 0),
                total_origin_price: toNumber(c.total_origin_price, 0),
              })),
            )
          }
        }

        if (mounted) {
          if (!sRes.ok) {
            console.error('GET /api/reservation-services failed:', sRes.status)
          } else {
            const data = (await sRes.json()) as { services?: any[] }
            const safe = Array.isArray(data.services) ? data.services : []

            setServices(
              safe.map((x) => ({
                id: Number(x.id),
                name: String(x.name ?? ''),
                description: x.description ?? null,
                price: toNumber(x.price, 0),
                image: x.image ?? null,
              })),
            )
          }
        }
      } catch (e) {
        console.error('load combos/services error:', e)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!effectivePreorderFood) return

    let mounted = true

    ;(async () => {
      try {
        const res = await fetch('/api/menu')
        if (!res.ok) {
          console.error('GET /api/menu failed:', res.status)
          return
        }

        const data = (await res.json()) as {
          categories?: Category[]
          items?: any[]
        }

        if (!mounted) return

        setCategories(Array.isArray(data.categories) ? data.categories : [])
        setMenuItems(
          (Array.isArray(data.items) ? data.items : []).map((x: any) => ({
            id: Number(x.id),
            name: String(x.name ?? ''),
            price: toNumber(x.price, 0),
            image: x.image ?? null,
            category_id: Number(x.category_id),
            category: x.category,
          })),
        )
      } catch (e) {
        console.error('load menu error:', e)
      }
    })()

    return () => {
      mounted = false
    }
  }, [effectivePreorderFood])

  useEffect(() => {
    const t = timeDate
    if (!t) return

    if (t.getTime() < minDate.getTime()) {
      setTimeLocal(toDatetimeLocalValue(minDate))
    }
  }, [minDate, minTimeLocal, timeDate])

  useEffect(() => {
    setOrderSummary(null)
  }, [
    guests,
    tableCount,
    tableTypeId,
    timeLocal,
    selectedItems,
    selectedServices,
    appliedCombos,
  ])

  const chosenType = useMemo(() => {
    const id = Number(tableTypeId)
    if (!id) return null
    return tableTypes.find((t) => t.id === id) ?? null
  }, [tableTypeId, tableTypes])

  useEffect(() => {
    if (!comboId) {
      setComboDetail(null)
      return
    }

    let mounted = true

    ;(async () => {
      try {
        const res = await fetch(`/api/combos/combos-detail/${comboId}`)
        if (!res.ok) {
          console.error('GET combo detail failed:', res.status)
          if (mounted) setComboDetail(null)
          return
        }

        const data = (await res.json()) as { combo?: any }
        const c = data.combo

        if (!mounted) return
        if (!c) {
          setComboDetail(null)
          return
        }

        const normalized: ComboDetail = {
          id: Number(c.id),
          title: String(c.title ?? ''),
          description: c.description ?? null,
          sale_price: toNumber(c.sale_price, 0),
          discount_percent:
            c.discount_percent == null ? null : toNumber(c.discount_percent, 0),
          total_origin_price: toNumber(c.total_origin_price, 0),
          combo_services: Array.isArray(c.combo_services)
            ? c.combo_services.map((cs: any) => ({
                service_id: Number(cs.service_id),
                quantity: Number(cs.quantity ?? 1),
                unit_price: toNumber(cs.unit_price, 0),
                services: {
                  id: Number(cs.services?.id),
                  name: String(cs.services?.name ?? ''),
                  description: cs.services?.description ?? null,
                },
              }))
            : [],
          combo_menu_items: Array.isArray(c.combo_menu_items)
            ? c.combo_menu_items.map((cm: any) => ({
                menu_item_id: Number(cm.menu_item_id),
                quantity: Number(cm.quantity ?? 1),
                unit_price: toNumber(cm.unit_price, 0),
                menu_items: {
                  id: Number(cm.menu_items?.id),
                  name: String(cm.menu_items?.name ?? ''),
                  price: toNumber(cm.menu_items?.price, 0),
                  image: cm.menu_items?.image ?? null,
                },
              }))
            : [],
        }

        setComboDetail(normalized)
        setComboDetailsMap((prev) => ({ ...prev, [normalized.id]: normalized }))
      } catch (e) {
        console.error('load combo detail error:', e)
        if (mounted) setComboDetail(null)
      }
    })()

    return () => {
      mounted = false
    }
  }, [comboId])

  function validateCommon() {
    if (!timeDate || isNaN(timeDate.getTime())) {
      showToast(
        'error',
        'Thông tin chưa hợp lệ',
        'Vui lòng chọn thời gian đặt bàn hợp lệ.',
      )
      return false
    }

    if (timeDate.getTime() < minDate.getTime()) {
      showToast(
        'error',
        'Thời gian chưa phù hợp',
        'Thời gian đặt bàn phải sau thời điểm hiện tại ít nhất 60 phút.',
      )
      return false
    }

    if (!guests || guests <= 0) {
      showToast(
        'error',
        'Số lượng khách chưa hợp lệ',
        'Số lượng khách phải lớn hơn 0.',
      )
      return false
    }

    if (!tableCount || tableCount <= 0) {
      showToast(
        'error',
        'Số lượng bàn chưa hợp lệ',
        'Số lượng bàn phải lớn hơn hoặc bằng 1.',
      )
      return false
    }

    if (tableCount > guests) {
      showToast(
        'warning',
        'Số lượng bàn chưa phù hợp',
        'Số lượng bàn không được lớn hơn số lượng khách.',
      )
      return false
    }

    if (!tableTypeId) {
      showToast(
        'error',
        'Thiếu thông tin',
        'Vui lòng chọn loại bàn trước khi tiếp tục.',
      )
      return false
    }

    return true
  }

  const filteredMenu = useMemo(() => {
    const catId = categoryFilter === 'all' ? null : Number(categoryFilter)
    const q = menuQuery.trim().toLowerCase()

    return menuItems.filter((m) => {
      if (catId && m.category_id !== catId) return false
      if (q && !m.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [menuItems, categoryFilter, menuQuery])

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase()
    return services.filter((s) =>
      !q ? true : s.name.toLowerCase().includes(q),
    )
  }, [services, serviceQuery])

  function getMenuMinQty(id: number) {
    return Number(comboIncludedMenuQty[id] ?? 0)
  }

  function getServiceMinQty(id: number) {
    return Number(comboIncludedServiceQty[id] ?? 0)
  }

  function incItem(id: number) {
    setSelectedItems((p) => ({ ...p, [id]: Number(p[id] ?? 0) + 1 }))
    setPreorderFood(true)
  }

  function decItem(id: number) {
    setSelectedItems((p) => {
      const next = { ...p }
      const cur = Number(next[id] ?? 0)
      const minQty = getMenuMinQty(id)

      if (cur <= minQty) return p

      const newQty = cur - 1
      if (newQty <= 0) delete next[id]
      else next[id] = newQty

      return next
    })
  }

  function incService(id: number) {
    setSelectedServices((p) => ({ ...p, [id]: Number(p[id] ?? 0) + 1 }))
    setEnableServices(true)
  }

  function decService(id: number) {
    setSelectedServices((p) => {
      const next = { ...p }
      const cur = Number(next[id] ?? 0)
      const minQty = getServiceMinQty(id)

      if (cur <= minQty) return p

      const newQty = cur - 1
      if (newQty <= 0) delete next[id]
      else next[id] = newQty

      return next
    })
  }

  function toggleCombo() {
    if (!comboDetail || comboBusy) return

    const combo = comboDetail
    const comboIdNum = combo.id
    const isApplied = Number(appliedCombos[comboIdNum] ?? 0) > 0

    setComboBusy(true)

    try {
      const prevApplied = { ...appliedCombos }

      const nextApplied: QtyMap = { ...prevApplied }
      if (isApplied) {
        delete nextApplied[comboIdNum]
      } else {
        nextApplied[comboIdNum] = 1
      }

      const nextDetailsMap = { ...comboDetailsMap, [comboIdNum]: combo }

      const prevMenuMin = buildComboIncludedMenuQty(prevApplied, nextDetailsMap)
      const nextMenuMin = buildComboIncludedMenuQty(nextApplied, nextDetailsMap)

      const prevServiceMin = buildComboIncludedServiceQty(
        prevApplied,
        nextDetailsMap,
      )
      const nextServiceMin = buildComboIncludedServiceQty(
        nextApplied,
        nextDetailsMap,
      )

      setComboDetailsMap(nextDetailsMap)
      setAppliedCombos(nextApplied)

      if (isApplied) {
        setSelectedItems((prev) =>
          subtractComboQty(prev, prevMenuMin, nextMenuMin),
        )
        setSelectedServices((prev) =>
          subtractComboQty(prev, prevServiceMin, nextServiceMin),
        )

        const stillHasMenu = Object.keys(nextMenuMin).length > 0
        const stillHasService = Object.keys(nextServiceMin).length > 0

        if (!stillHasMenu) setPreorderFood(false)
        if (!stillHasService) setEnableServices(false)

        showToast(
          'info',
          'Đã bỏ áp dụng combo',
          `Combo "${combo.title}" đã được gỡ khỏi đặt bàn.`,
        )
      } else {
        if (combo.combo_menu_items?.length) {
          setPreorderFood(true)
          setSelectedItems((prev) => {
            const next = { ...normalizePositiveMap(prev) }
            for (const cm of combo.combo_menu_items) {
              const menuItemId = Number(cm.menu_item_id)
              const addQty = Number(cm.quantity ?? 1)
              next[menuItemId] = Number(next[menuItemId] ?? 0) + addQty
            }
            return next
          })
        }

        if (combo.combo_services?.length) {
          setEnableServices(true)
          setSelectedServices((prev) => {
            const next = { ...normalizePositiveMap(prev) }
            for (const cs of combo.combo_services) {
              const serviceId = Number(cs.service_id)
              const addQty = Number(cs.quantity ?? 1)
              next[serviceId] = Number(next[serviceId] ?? 0) + addQty
            }
            return next
          })
        }

        showToast(
          'success',
          'Áp dụng combo thành công',
          `Bạn đã áp dụng combo: ${combo.title}.`,
        )
      }
    } finally {
      setTimeout(() => setComboBusy(false), 400)
    }
  }

  function clearItemsKeepComboMinimum() {
    setSelectedItems({ ...comboIncludedMenuQty })
  }

  function clearServicesKeepComboMinimum() {
    setSelectedServices({ ...comboIncludedServiceQty })
  }

  async function createReservation() {
    if (!userId) {
      showToast(
        'error',
        'Bạn chưa đăng nhập',
        'Vui lòng đăng nhập để thực hiện đặt bàn.',
      )
      return
    }

    if (!validateCommon()) return

    setLoadingCreate(true)
    showToast(
      'info',
      'Đang xử lý yêu cầu',
      'Hệ thống đang tiến hành tạo đặt bàn cho bạn.',
      { loading: true },
    )

    try {
      const mustSendItems = effectivePreorderFood && itemsArray.length > 0
      const mustSendServices =
        effectiveEnableServices && servicesArray.length > 0

      const payload: any = {
        user_id: userId,
        reservation_time: timeDate!.toISOString(),
        number_of_guests: guests,
        table_count: tableCount,
        table_type_id: Number(tableTypeId),
        ...(mustSendItems ? { items: itemsArray } : {}),
        ...(mustSendServices ? { services: servicesArray } : {}),
        ...(combosArray.length ? { combos: combosArray } : {}),
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await res.json()) as CreateReservationResponse & {
        message?: string
      }

      if (!res.ok) {
        showToast(
          'error',
          'Đặt bàn không thành công',
          data.message ?? 'Không thể tạo yêu cầu đặt bàn.',
        )
        return
      }

      if (data.pricing) {
        setOrderSummary({
          subtotal: toNumber(data.pricing.subtotal, 0),
          membershipDiscountPercent: toNumber(
            data.pricing.membership_discount_percent,
            0,
          ),
          discountAmount: toNumber(data.pricing.discount_amount, 0),
          grandTotal: toNumber(data.pricing.grand_total, 0),
          depositRequired: toNumber(data.pricing.deposit_required, 0),
          membershipName: data.membership?.name ?? null,
          membershipMinPoint: toNumber(data.pricing.membership_min_point, 0),
          freeDeposit: Boolean(data.pricing.free_deposit),
        })
      }
      const extras = [
        mustSendItems
          ? `Món ăn: ${itemsArray.reduce((s, x) => s + x.quantity, 0)} phần`
          : null,
        mustSendServices
          ? `Dịch vụ: ${servicesArray.reduce((s, x) => s + x.quantity, 0)} mục`
          : null,
        combosArray.length
          ? `Combo: ${combosArray.reduce((s, x) => s + x.quantity, 0)}`
          : null,
      ].filter(Boolean)

      showToast(
        'success',
        'Đặt bàn thành công',
        `Bàn đã được xếp: ${(data.table_ids ?? []).join(', ') || '(chưa xác định)'}${
          extras.length ? ` | ${extras.join(' | ')}` : ''
        }`,
      )

      setSelectedItems({})
      setSelectedServices({})
      setAppliedCombos({})
      setComboId('')
      setComboDetail(null)
      setPreorderFood(false)
      setEnableServices(false)

      const reservationId =
        Number(data.reservation?.id) ||
        Number((data as any).reservation_id) ||
        0

      if (reservationId > 0) {
        setTimeout(() => {
          router.push(`/reservation-history/${reservationId}`)
        }, 1000)
        return
      }
    } catch (error) {
      console.error('create reservation error:', error)
      showToast(
        'error',
        'Lỗi kết nối',
        'Đã xảy ra lỗi mạng trong quá trình tạo đặt bàn.',
      )
    } finally {
      setLoadingCreate(false)
    }
  }

  return (
    <div className="reservation-page">
      <LiquidGlassMessage
        type={toast.type}
        title={toast.title}
        message={toast.message}
        isVisible={toast.visible}
        onClose={hideToast}
        autoClose={toast.loading ? 0 : 4000}
        showIcon
        showCloseButton
        glassIntensity="medium"
        bubbleEffect
        glowEffect
        position="top-right"
        toastKey={toast.key}
        loading={toast.loading}
      />

      <div className="reservation-page__bg" />

      <div className="reservation-page__container">
        <section className="reservation-hero">
          <div className="reservation-hero__badge">Đặt bàn trực tuyến</div>
          <h1 className="reservation-hero__title">
            Đặt bàn nhanh chóng và thuận tiện
          </h1>
          <p className="reservation-hero__desc">
            Xin chào <span>{userName}</span>, hãy chọn thời gian, số lượng khách
            và các dịch vụ phù hợp để hoàn tất đặt bàn.
          </p>
        </section>

        <section className="reservation-card">
          <div className="reservation-card__header">
            <div>
              <h2>Thông tin đặt bàn</h2>
              <p>
                Vui lòng điền đầy đủ thông tin bên dưới để hệ thống tự động sắp
                xếp bàn phù hợp.
              </p>
            </div>

            <div className="reservation-summary">
              <div className="reservation-summary__item">
                <strong>{guests}</strong>
                <span>Khách</span>
              </div>
              <div className="reservation-summary__item">
                <strong>{tableCount}</strong>
                <span>Bàn</span>
              </div>
              <div className="reservation-summary__item">
                <strong>
                  {itemsArray.reduce((s, x) => s + x.quantity, 0) +
                    servicesArray.reduce((s, x) => s + x.quantity, 0) +
                    combosArray.reduce((s, x) => s + x.quantity, 0)}
                </strong>
                <span>Lựa chọn</span>
              </div>
            </div>
          </div>

          <div className="reservation-card__body">
            <ReservationForm
              guests={guests}
              setGuests={setGuests}
              tableCount={tableCount}
              setTableCount={setTableCount}
              tableTypes={tableTypes}
              tableTypeId={tableTypeId}
              setTableTypeId={setTableTypeId}
              chosenType={chosenType}
              timeLocal={timeLocal}
              setTimeLocal={setTimeLocal}
              minTimeLocal={minTimeLocal}
            />

            <div className="reservation-options">
              <label className="reservation-toggle">
                <input
                  type="checkbox"
                  checked={effectivePreorderFood}
                  onChange={(e) => {
                    if (!e.target.checked && hasComboMenu) return
                    setPreorderFood(e.target.checked)
                  }}
                />
                <span className="reservation-toggle__box" />
                <span className="reservation-toggle__content">
                  <span className="reservation-toggle__title">
                    Đặt món trước
                  </span>
                  <span className="reservation-toggle__desc">
                    {hasComboMenu
                      ? 'Đang được bật do combo đã áp dụng có chứa món ăn.'
                      : 'Bật tùy chọn này để chọn món ăn trước khi đến nhà hàng.'}
                  </span>
                </span>
              </label>

              <label className="reservation-toggle">
                <input
                  type="checkbox"
                  checked={effectiveEnableServices}
                  onChange={(e) => {
                    if (!e.target.checked && hasComboService) return
                    setEnableServices(e.target.checked)
                  }}
                />
                <span className="reservation-toggle__box" />
                <span className="reservation-toggle__content">
                  <span className="reservation-toggle__title">
                    Chọn thêm dịch vụ
                  </span>
                  <span className="reservation-toggle__desc">
                    {hasComboService
                      ? 'Đang được bật do combo đã áp dụng có chứa dịch vụ.'
                      : 'Bạn có thể chọn dịch vụ riêng ngay cả khi không đặt món trước.'}
                  </span>
                </span>
              </label>
            </div>

            <ComboSection
              combos={combos}
              comboId={comboId}
              setComboId={setComboId}
              comboDetail={comboDetail}
              onToggleCombo={toggleCombo}
              isApplied={isCurrentComboApplied}
              busy={comboBusy}
            />

            <MenuSection
              preorderFood={effectivePreorderFood}
              categories={categories}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              menuQuery={menuQuery}
              setMenuQuery={setMenuQuery}
              filteredMenu={filteredMenu}
              selectedItems={selectedItems}
              onIncItem={incItem}
              onDecItem={decItem}
              onClearItems={clearItemsKeepComboMinimum}
              itemsCount={itemsArray.length}
            />

            <ServiceSection
              enableServices={effectiveEnableServices}
              serviceQuery={serviceQuery}
              setServiceQuery={setServiceQuery}
              filteredServices={filteredServices}
              selectedServices={selectedServices}
              onIncService={incService}
              onDecService={decService}
              onClearServices={clearServicesKeepComboMinimum}
              servicesCount={servicesArray.length}
            />

            {hasAnySelection && displayedSummary && (
              <section className="reservation-order-summary">
                <div className="reservation-order-summary__header">
                  <div>
                    <h3 className="reservation-order-summary__title">
                      Tóm tắt đơn đặt bàn
                    </h3>
                  </div>
                </div>

                <div className="reservation-order-summary__body">
                  <div className="reservation-order-summary__row">
                    <span>Giá gốc: </span>
                    <strong>
                      {displayedSummary.subtotal.toLocaleString('vi-VN')}₫
                    </strong>
                  </div>

                  <div className="reservation-order-summary__row">
                    <span>
                      Giá giảm membership
                      {displayedSummary.membershipDiscountPercent > 0
                        ? ` (${displayedSummary.membershipDiscountPercent}%)`
                        : ''}
                      :
                    </span>
                    <strong className="is-discount">
                      -{displayedSummary.discountAmount.toLocaleString('vi-VN')}
                      ₫
                    </strong>
                  </div>

                  <div className="reservation-order-summary__row reservation-order-summary__row--total">
                    <span>Giá cuối cùng: </span>
                    <strong>
                      {displayedSummary.grandTotal.toLocaleString('vi-VN')}₫
                    </strong>
                  </div>

                  {!displayedSummary.freeDeposit && (
                    <div className="reservation-order-summary__row">
                      <span>Tiền cọc tạm tính</span>
                      <strong>
                        {displayedSummary.depositRequired.toLocaleString(
                          'vi-VN',
                        )}
                        ₫
                      </strong>
                    </div>
                  )}

                  {displayedSummary.freeDeposit && (
                    <div className="reservation-order-summary__note">
                      Thành viên hạng {displayedSummary.membershipName} được
                      miễn cọc{' '}
                    </div>
                  )}
                </div>
              </section>
            )}

            <div className="reservation-actions">
              <button
                className="reservation-submit"
                onClick={createReservation}
                disabled={loadingCreate || tableCount > guests}
                type="button"
              >
                {loadingCreate ? 'Đang xử lý...' : 'Đặt bàn ngay'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
