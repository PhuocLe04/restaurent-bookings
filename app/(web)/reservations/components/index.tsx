'use client'

import { useEffect, useMemo, useState } from 'react'
import ReservationForm from './reservations-form'
import ComboSection from './reservations-combo'
import MenuSection from './reservations-menu'
import ServiceSection from './reservations-service'

export type TableType = {
  id: number
  name: string
  description?: string | null
}
export type Category = { id: number; name: string }

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
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function toDatetimeLocalValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
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

export default function ReservationClient({ userId }: { userId: number }) {
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
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  // toggles
  const [preorderFood, setPreorderFood] = useState<boolean>(false)
  const [enableServices, setEnableServices] = useState<boolean>(false)

  // menu
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [menuQuery, setMenuQuery] = useState<string>('')
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})

  // services
  const [services, setServices] = useState<Service[]>([])
  const [serviceQuery, setServiceQuery] = useState<string>('')
  const [selectedServices, setSelectedServices] = useState<
    Record<number, number>
  >({})

  // combos
  const [combos, setCombos] = useState<Combo[]>([])
  const [comboId, setComboId] = useState<string>('')
  const [comboDetail, setComboDetail] = useState<ComboDetail | null>(null)
  const [appliedCombos, setAppliedCombos] = useState<Record<number, number>>({})

  // derived arrays
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
        .map(([id, qty]) => ({ service_id: Number(id), quantity: Number(qty) }))
        .filter((x) => x.service_id && x.quantity > 0),
    [selectedServices],
  )

  const combosArray = useMemo(
    () =>
      Object.entries(appliedCombos)
        .map(([id, qty]) => ({ combo_id: Number(id), quantity: Number(qty) }))
        .filter((x) => x.combo_id && x.quantity > 0),
    [appliedCombos],
  )

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // table types
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/table-type')
        if (!res.ok)
          return console.error('GET /api/table-type failed:', res.status)
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

  // combos + services once
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch('/api/combos'),
          fetch('/api/reservation-services'),
        ])

        if (mounted) {
          if (!cRes.ok) console.error('GET /api/combos failed:', cRes.status)
          else {
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
          if (!sRes.ok)
            console.error('GET /api/reservation-services failed:', sRes.status)
          else {
            const data = (await sRes.json()) as { services?: any[] }
            const safe = Array.isArray(data.services) ? data.services : []
            setServices(
              safe.map((x) => ({
                id: Number(x.id),
                name: String(x.name ?? ''),
                description: x.description ?? null,
                price: toNumber(x.price, 0),
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

  // menu when preorderFood
  useEffect(() => {
    if (!preorderFood) return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/menu')
        if (!res.ok) return console.error('GET /api/menu failed:', res.status)
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
  }, [preorderFood])

  // time bump
  useEffect(() => {
    const t = timeDate
    if (!t) return
    if (t.getTime() < minDate.getTime())
      setTimeLocal(toDatetimeLocalValue(minDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTimeLocal])

  const chosenType = useMemo(() => {
    const id = Number(tableTypeId)
    if (!id) return null
    return tableTypes.find((t) => t.id === id) ?? null
  }, [tableTypeId, tableTypes])

  // combo detail fetch
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
        if (!c) return setComboDetail(null)

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
    if (!timeDate || isNaN(timeDate.getTime()))
      return (setError('Vui lòng nhập thời gian hợp lệ'), false)
    if (timeDate.getTime() < minDate.getTime())
      return (
        setError('Thời gian đặt bàn phải >= thời điểm hiện tại + 60 phút'),
        false
      )
    if (!guests || guests <= 0) return (setError('Số khách phải > 0'), false)
    if (!tableCount || tableCount <= 0)
      return (setError('Số lượng bàn phải >= 1'), false)
    if (tableCount > guests)
      return (setError('Số lượng bàn không được lớn hơn số khách'), false)
    if (!tableTypeId) return (setError('Vui lòng chọn loại bàn'), false)
    return true
  }

  // ===== menu actions passed down =====
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

  function incItem(id: number) {
    setSelectedItems((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
  }
  function decItem(id: number) {
    setSelectedItems((p) => {
      const n = { ...p }
      const cur = n[id] ?? 0
      if (cur <= 1) delete n[id]
      else n[id] = cur - 1
      return n
    })
  }

  function incService(id: number) {
    setSelectedServices((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
    setEnableServices(true)
  }
  function decService(id: number) {
    setSelectedServices((p) => {
      const n = { ...p }
      const cur = n[id] ?? 0
      if (cur <= 1) delete n[id]
      else n[id] = cur - 1
      return n
    })
  }

  function applyCombo() {
    if (!comboDetail) return
    const cId = comboDetail.id

    setAppliedCombos((p) => ({ ...p, [cId]: (p[cId] ?? 0) + 1 }))

    if (comboDetail.combo_services?.length) {
      setEnableServices(true)
      setSelectedServices((prev) => {
        const next = { ...prev }
        for (const cs of comboDetail.combo_services) {
          next[cs.service_id] =
            (next[cs.service_id] ?? 0) + Number(cs.quantity ?? 1)
        }
        return next
      })
    }

    if (comboDetail.combo_menu_items?.length) {
      setPreorderFood(true)
      setSelectedItems((prev) => {
        const next = { ...prev }
        for (const cm of comboDetail.combo_menu_items) {
          next[cm.menu_item_id] =
            (next[cm.menu_item_id] ?? 0) + Number(cm.quantity ?? 1)
        }
        return next
      })
    }

    setSuccess(`Đã áp dụng combo: ${comboDetail.title}`)
    setError('')
  }

  async function createReservation() {
    setError('')
    setSuccess('')

    if (!userId) return setError('Bạn chưa đăng nhập.')
    if (!validateCommon()) return

    setLoadingCreate(true)
    try {
      const payload: any = {
        user_id: userId,
        reservation_time: timeDate!.toISOString(),
        number_of_guests: guests,
        mode: 'auto',
        table_count: tableCount,
        table_type_id: Number(tableTypeId),

        ...(preorderFood && itemsArray.length ? { items: itemsArray } : {}),
        ...(enableServices && servicesArray.length
          ? { services: servicesArray }
          : {}),
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
      if (!res.ok) return setError(data.message ?? 'Đặt bàn thất bại')

      const extras = [
        preorderFood && itemsArray.length
          ? `Món: ${itemsArray.reduce((s, x) => s + x.quantity, 0)} phần`
          : null,
        enableServices && servicesArray.length
          ? `Dịch vụ: ${servicesArray.reduce((s, x) => s + x.quantity, 0)} mục`
          : null,
        combosArray.length ? `Combo: ${combosArray.length}` : null,
      ].filter(Boolean)

      setSuccess(
        `Đặt bàn thành công. Bàn: ${(data.table_ids ?? []).join(', ') || '(không rõ)'}` +
          (extras.length ? ` | ${extras.join(' | ')}` : ''),
      )

      setSelectedItems({})
      setSelectedServices({})
      setAppliedCombos({})
      setComboId('')
      setComboDetail(null)
    } catch {
      setError('Lỗi mạng khi tạo reservation')
    } finally {
      setLoadingCreate(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
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

      {/* toggles */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={preorderFood}
            onChange={(e) => setPreorderFood(e.target.checked)}
          />
          <span className="font-medium">Đặt món trước</span>
          <span className="text-muted-foreground">(tick mới hiện menu)</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableServices}
            onChange={(e) => setEnableServices(e.target.checked)}
          />
          <span className="font-medium">Chọn dịch vụ</span>
          <span className="text-muted-foreground">
            (có thể chọn dịch vụ mà không cần món)
          </span>
        </label>
      </div>

      <ComboSection
        combos={combos}
        comboId={comboId}
        setComboId={setComboId}
        comboDetail={comboDetail}
        onApplyCombo={applyCombo}
      />

      <MenuSection
        preorderFood={preorderFood}
        categories={categories}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        menuQuery={menuQuery}
        setMenuQuery={setMenuQuery}
        filteredMenu={filteredMenu}
        selectedItems={selectedItems}
        onIncItem={incItem}
        onDecItem={decItem}
        onClearItems={() => setSelectedItems({})}
        itemsCount={itemsArray.length}
      />

      <ServiceSection
        enableServices={enableServices}
        serviceQuery={serviceQuery}
        setServiceQuery={setServiceQuery}
        filteredServices={filteredServices}
        selectedServices={selectedServices}
        onIncService={incService}
        onDecService={decService}
        onClearServices={() => setSelectedServices({})}
        servicesCount={servicesArray.length}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="ml-auto flex gap-2">
          <button
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={createReservation}
            disabled={loadingCreate || tableCount > guests}
            type="button"
          >
            {loadingCreate ? 'Đang đặt...' : 'Đặt bàn'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}
    </div>
  )
}
