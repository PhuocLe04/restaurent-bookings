import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_DEPOSIT_RATE = 0.3

function parseId(idRaw: string) {
  const id = Number(idRaw)
  return Number.isFinite(id) && id > 0 ? Math.floor(id) : null
}

function safeDecimal(value: any) {
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toMapById<T extends { id: number }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

type ComboShape = {
  id: number
  title: string
  description: string | null
  sale_price: any
  total_origin_price: any
  discount_percent: any
  combo_menu_items: Array<{
    menu_item_id: number
    quantity: number
    unit_price: any
    menu_items?: { id: number; name: string } | null
  }>
  combo_services: Array<{
    service_id: number
    quantity: number
    unit_price: any
    services?: { id: number; name: string } | null
  }>
}

type DraftMenuItem = {
  menu_item_id: number
  quantity: number
}

type DraftServiceItem = {
  service_id: number
  quantity: number
}

type EditMenuInput = {
  menu_item_id: number
  quantity?: number
  remove?: boolean
}

type EditServiceInput = {
  service_id: number
  quantity?: number
  remove?: boolean
}

function getMatchedCombos(input: {
  menuQtyMap: Map<number, number>
  serviceQtyMap: Map<number, number>
  combos: ComboShape[]
}) {
  const { menuQtyMap, serviceQtyMap, combos } = input

  return combos
    .map((combo) => {
      for (const item of combo.combo_menu_items) {
        const currentQty = menuQtyMap.get(item.menu_item_id) || 0
        if (currentQty < (item.quantity || 0)) return null
      }

      for (const item of combo.combo_services) {
        const currentQty = serviceQtyMap.get(item.service_id) || 0
        if (currentQty < (item.quantity || 0)) return null
      }

      const comboOriginFromItems =
        combo.combo_menu_items.reduce(
          (sum, item) =>
            sum + safeDecimal(item.unit_price) * (item.quantity || 0),
          0,
        ) +
        combo.combo_services.reduce(
          (sum, item) =>
            sum + safeDecimal(item.unit_price) * (item.quantity || 0),
          0,
        )

      const total_origin_price =
        safeDecimal(combo.total_origin_price) || comboOriginFromItems

      const sale_price = safeDecimal(combo.sale_price)
      const saving = Math.max(0, roundMoney(total_origin_price - sale_price))

      return {
        id: combo.id,
        title: combo.title,
        description: combo.description,
        total_origin_price: roundMoney(total_origin_price),
        sale_price: roundMoney(sale_price),
        discount_percent: safeDecimal(combo.discount_percent),
        saving,
        menu_items: combo.combo_menu_items.map((item) => ({
          menu_item_id: item.menu_item_id,
          name: item.menu_items?.name || '',
          quantity: item.quantity || 0,
          unit_price: safeDecimal(item.unit_price),
        })),
        service_items: combo.combo_services.map((item) => ({
          service_id: item.service_id,
          name: item.services?.name || '',
          quantity: item.quantity || 0,
          unit_price: safeDecimal(item.unit_price),
        })),
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.saving - a.saving)
}

async function loadOrderDetail(orderId: number) {
  return prisma.orders.findUnique({
    where: { id: orderId },
    include: {
      users: {
        select: {
          id: true,
          full_name: true,
          email: true,
          phone: true,
          role: true,
          member_point: true,
          membership: {
            select: {
              id: true,
              code: true,
              name: true,
              discount_percent: true,
            },
          },
        },
      },
      order_items: {
        include: {
          menu_items: {
            include: {
              categories: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      reservations: {
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          reservation_tables: {
            include: {
              restaurant_tables: {
                include: {
                  table_types: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
          reservation_services: {
            include: {
              services: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  description: true,
                  price: true,
                  is_active: true,
                  created_at: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              payment_method: true,
              purpose: true,
              status: true,
              order_id: true,
              request_id: true,
              partner_transaction_id: true,
              gateway_response: true,
              created_at: true,
              paid_at: true,
            },
            orderBy: { id: 'desc' },
          },
        },
      },
    },
  })
}

async function loadActiveCombos() {
  return prisma.combo.findMany({
    where: { is_active: true },
    include: {
      combo_menu_items: {
        include: {
          menu_items: {
            select: { id: true, name: true },
          },
        },
      },
      combo_services: {
        include: {
          services: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { id: 'desc' },
  })
}

function calcDepositRequired(params: {
  currentGrandTotal: number
  currentDepositRequired: number
  nextGrandTotal: number
  hasPaidDeposit: boolean
  memberPoint: number
}) {
  const {
    currentGrandTotal,
    currentDepositRequired,
    nextGrandTotal,
    hasPaidDeposit,
    memberPoint,
  } = params

  if (hasPaidDeposit) {
    return roundMoney(currentDepositRequired)
  }

  if (memberPoint >= 20_000_000) {
    return 0
  }

  const derivedRate =
    currentGrandTotal > 0 && currentDepositRequired > 0
      ? currentDepositRequired / currentGrandTotal
      : DEFAULT_DEPOSIT_RATE

  return roundMoney(nextGrandTotal * derivedRate)
}

async function buildOrderResponse(
  orderId: number,
  options?: {
    draftMenuItems?: DraftMenuItem[] | null
    draftServiceItems?: DraftServiceItem[] | null
    selectedComboId?: number | null
    draftStatus?: string | null
    previewOnly?: boolean
  },
) {
  const order = await loadOrderDetail(orderId)
  if (!order) return null

  const combos = await loadActiveCombos()

  const membershipDiscountPercent = safeDecimal(
    order.users?.membership?.discount_percent,
  )
  const memberMultiplier = Math.max(0, 1 - membershipDiscountPercent / 100)
  const memberPoint = safeDecimal(order.users?.member_point)

  const payments =
    order.reservations?.payments?.map((p) => ({
      id: p.id,
      amount: safeDecimal(p.amount),
      payment_method: p.payment_method,
      purpose: p.purpose,
      status: p.status,
      order_id: p.order_id,
      request_id: p.request_id,
      partner_transaction_id: p.partner_transaction_id,
      gateway_response: p.gateway_response,
      created_at: p.created_at,
      paid_at: p.paid_at,
    })) || []

  const depositSuccessPayments = payments.filter(
    (p) =>
      normalizeText(p.status) === 'SUCCESS' &&
      normalizeText(p.purpose) === 'DEPOSIT',
  )

  const depositPendingPayments = payments.filter(
    (p) =>
      normalizeText(p.status) === 'PENDING' &&
      normalizeText(p.purpose) === 'DEPOSIT',
  )

  const finalSuccessPayments = payments.filter(
    (p) =>
      normalizeText(p.status) === 'SUCCESS' &&
      normalizeText(p.purpose) === 'FINAL',
  )

  const paid_total = roundMoney(
    depositSuccessPayments.reduce((sum, item) => sum + item.amount, 0),
  )

  const pending_total = roundMoney(
    depositPendingPayments.reduce((sum, item) => sum + item.amount, 0),
  )

  const final_paid_total = roundMoney(
    finalSuccessPayments.reduce((sum, item) => sum + item.amount, 0),
  )

  const hasPaidDeposit = paid_total > 0
  const hasPaidFinal = finalSuccessPayments.length > 0

  const currentGrandTotal = safeDecimal(order.grand_total)
  const currentDepositRequired = safeDecimal(order.deposit_required)

  const menuBaseMap = new Map<
    number,
    {
      name: string
      image: string | null
      category: string | null
      is_available: boolean
      base_price: number
    }
  >()

  for (const item of order.order_items) {
    menuBaseMap.set(item.menu_item_id, {
      name: item.menu_items?.name || '',
      image: item.menu_items?.image || null,
      category: item.menu_items?.categories?.name || null,
      is_available: item.menu_items?.is_available ?? true,
      base_price: safeDecimal(item.menu_items?.price),
    })
  }

  const serviceBaseMap = new Map<
    number,
    {
      name: string
      image: string | null
      description: string | null
      is_active: boolean
      created_at: Date | null
      base_price: number
    }
  >()

  for (const item of order.reservations?.reservation_services || []) {
    serviceBaseMap.set(item.service_id, {
      name: item.services?.name || '',
      image: item.services?.image || null,
      description: item.services?.description || null,
      is_active: item.services?.is_active ?? true,
      created_at: item.services?.created_at || null,
      base_price: safeDecimal(item.services?.price),
    })
  }

  const draftMenuInputs = options?.draftMenuItems ?? null
  const draftServiceInputs = options?.draftServiceItems ?? null

  if (draftMenuInputs?.length) {
    const missingMenuIds = draftMenuInputs
      .map((x) => x.menu_item_id)
      .filter((id) => !menuBaseMap.has(id))

    if (missingMenuIds.length) {
      const missingMenus = await prisma.menu_items.findMany({
        where: { id: { in: missingMenuIds } },
        include: {
          categories: { select: { id: true, name: true } },
        },
      })

      for (const item of missingMenus) {
        menuBaseMap.set(item.id, {
          name: item.name,
          image: item.image || null,
          category: item.categories?.name || null,
          is_available: item.is_available ?? true,
          base_price: safeDecimal(item.price),
        })
      }
    }
  }

  if (draftServiceInputs?.length) {
    const missingServiceIds = draftServiceInputs
      .map((x) => x.service_id)
      .filter((id) => !serviceBaseMap.has(id))

    if (missingServiceIds.length) {
      const missingServices = await prisma.services.findMany({
        where: { id: { in: missingServiceIds } },
        select: {
          id: true,
          name: true,
          image: true,
          description: true,
          is_active: true,
          created_at: true,
          price: true,
        },
      })

      for (const item of missingServices) {
        serviceBaseMap.set(item.id, {
          name: item.name,
          image: item.image || null,
          description: item.description || null,
          is_active: item.is_active ?? true,
          created_at: item.created_at || null,
          base_price: safeDecimal(item.price),
        })
      }
    }
  }

  const finalMenuInputs: DraftMenuItem[] = draftMenuInputs
    ? draftMenuInputs
        .map((x) => ({
          menu_item_id: Number(x.menu_item_id),
          quantity: Number(x.quantity),
        }))
        .filter(
          (x) =>
            Number.isFinite(x.menu_item_id) &&
            x.menu_item_id > 0 &&
            Number.isFinite(x.quantity) &&
            x.quantity >= 0,
        )
    : order.order_items.map((x) => ({
        menu_item_id: x.menu_item_id,
        quantity: x.quantity || 0,
      }))

  const finalServiceInputs: DraftServiceItem[] = draftServiceInputs
    ? draftServiceInputs
        .map((x) => ({
          service_id: Number(x.service_id),
          quantity: Number(x.quantity),
        }))
        .filter(
          (x) =>
            Number.isFinite(x.service_id) &&
            x.service_id > 0 &&
            Number.isFinite(x.quantity) &&
            x.quantity >= 0,
        )
    : (order.reservations?.reservation_services || []).map((x) => ({
        service_id: x.service_id,
        quantity: x.quantity || 0,
      }))

  const menu_items = finalMenuInputs
    .filter((x) => x.quantity > 0)
    .map((input) => {
      const def = menuBaseMap.get(input.menu_item_id)
      const basePrice = safeDecimal(def?.base_price)
      const discountedUnitPrice = roundMoney(basePrice * memberMultiplier)

      return {
        menu_item_id: input.menu_item_id,
        name: def?.name || '',
        image: def?.image || null,
        category: def?.category || null,
        quantity: input.quantity,
        original_unit_price: basePrice,
        unit_price: discountedUnitPrice,
        line_total: roundMoney(discountedUnitPrice * input.quantity),
        is_available: def?.is_available ?? true,
      }
    })

  const service_items = finalServiceInputs
    .filter((x) => x.quantity > 0)
    .map((input) => {
      const def = serviceBaseMap.get(input.service_id)
      const basePrice = safeDecimal(def?.base_price)
      const discountedUnitPrice = roundMoney(basePrice * memberMultiplier)

      return {
        service_id: input.service_id,
        name: def?.name || '',
        image: def?.image || null,
        description: def?.description || null,
        quantity: input.quantity,
        original_unit_price: basePrice,
        unit_price: discountedUnitPrice,
        line_total: roundMoney(discountedUnitPrice * input.quantity),
        is_active: def?.is_active ?? true,
        created_at: def?.created_at || null,
      }
    })

  const menu_total = roundMoney(
    menu_items.reduce((sum, item) => sum + item.line_total, 0),
  )

  const service_total = roundMoney(
    service_items.reduce((sum, item) => sum + item.line_total, 0),
  )

  const subtotal_before_combo = roundMoney(menu_total + service_total)

  const menuQtyMap = new Map<number, number>()
  for (const item of menu_items) {
    menuQtyMap.set(item.menu_item_id, item.quantity)
  }

  const serviceQtyMap = new Map<number, number>()
  for (const item of service_items) {
    serviceQtyMap.set(item.service_id, item.quantity)
  }

  const matched_combos = getMatchedCombos({
    menuQtyMap,
    serviceQtyMap,
    combos,
  })

  const selectedComboId =
    options?.selectedComboId == null ? null : Number(options.selectedComboId)

  const current_combo =
    matched_combos.find((x: any) => x.id === selectedComboId) || null
  const best_combo = matched_combos[0] || null
  const current_combo_saving = current_combo?.saving || 0

  const better_combo_candidates = matched_combos.filter(
    (x: any) => x.saving > current_combo_saving,
  )

  const combo_discount_amount = current_combo
    ? Math.min(current_combo.saving, subtotal_before_combo)
    : 0

  const after_combo_total = Math.max(
    0,
    roundMoney(subtotal_before_combo - combo_discount_amount),
  )

  const final_total = after_combo_total

  const deposit_required = calcDepositRequired({
    currentGrandTotal,
    currentDepositRequired,
    nextGrandTotal: final_total,
    hasPaidDeposit,
    memberPoint,
  })

  const remaining_estimated = hasPaidFinal
    ? 0
    : Math.max(0, roundMoney(final_total - paid_total))

  const is_deposit_paid =
    deposit_required <= 0
      ? true
      : roundMoney(paid_total) >= roundMoney(deposit_required)

  const deposit_status =
    deposit_required <= 0
      ? 'NOT_REQUIRED'
      : is_deposit_paid
        ? 'PAID'
        : pending_total > 0
          ? 'PENDING'
          : 'UNPAID'

  const tables =
    order.reservations?.reservation_tables?.map((item) => ({
      table_id: item.table_id,
      table_name: item.restaurant_tables?.table_name || '',
      capacity: item.restaurant_tables?.capacity || 0,
      table_type: item.restaurant_tables?.table_types?.name || null,
      table_type_description:
        item.restaurant_tables?.table_types?.description || null,
    })) || []

  return {
    id: order.id,
    reservation_id: order.reservation_id,
    user_id: order.user_id,
    status:
      options?.draftStatus && ['OPEN', 'CLOSED'].includes(options.draftStatus)
        ? options.draftStatus
        : order.status,
    grand_total: roundMoney(final_total),
    deposit_required: roundMoney(deposit_required),
    created_at: order.created_at,
    preview_only: !!options?.previewOnly,

    user: {
      id: order.users?.id,
      full_name: order.users?.full_name,
      email: order.users?.email,
      phone: order.users?.phone,
      role: order.users?.role,
      member_point: memberPoint,
      membership: order.users?.membership || null,
      membership_discount_percent: membershipDiscountPercent,
    },

    reservation: {
      id: order.reservations?.id,
      reservation_time: order.reservations?.reservation_time,
      reservation_endtime: order.reservations?.reservation_endtime,
      checked_in_at: order.reservations?.checked_in_at,
      completed_at: order.reservations?.completed_at,
      number_of_guests: order.reservations?.number_of_guests,
      status: order.reservations?.status,
      customer: order.reservations?.users || null,
      tables,
    },

    menu_items,
    service_items,
    payments,

    deposit: {
      required: roundMoney(deposit_required),
      paid_total,
      pending_total,
      remaining: Math.max(0, roundMoney(deposit_required - paid_total)),
      is_paid: is_deposit_paid,
      status: deposit_status,
      paid_payments: depositSuccessPayments,
      pending_payments: depositPendingPayments,
    },

    combo_check: {
      matched_count: matched_combos.length,
      matched_combos,
      current_combo_id: current_combo?.id || null,
      current_combo_saving,
      better_combo_available: better_combo_candidates.length > 0,
      better_combo_candidates,
      best_combo_id: best_combo?.id || null,
      selected_combo_id: selectedComboId,
      combo_discount_amount: roundMoney(combo_discount_amount),
    },

    summary: {
      menu_total,
      service_total,
      subtotal_before_combo,
      order_grand_total: roundMoney(final_total),
      combo_discount_amount: roundMoney(combo_discount_amount),
      paid_total,
      pending_total,
      final_paid_total,
      has_paid_final: hasPaidFinal,
      remaining_estimated,
    },
  }
}

function buildAuditDescription(params: {
  orderId: number
  oldStatus: string
  newStatus: string
  oldGrandTotal: number
  newGrandTotal: number
  oldDepositRequired: number
  newDepositRequired: number
  menuChanged: boolean
  serviceChanged: boolean
  selectedComboId?: number | null
}) {
  const {
    orderId,
    oldStatus,
    newStatus,
    oldGrandTotal,
    newGrandTotal,
    oldDepositRequired,
    newDepositRequired,
    menuChanged,
    serviceChanged,
    selectedComboId,
  } = params

  const parts = [
    `Cập nhật order #${orderId}`,
    `status: ${oldStatus} -> ${newStatus}`,
    `grand_total: ${oldGrandTotal} -> ${newGrandTotal}`,
    `deposit_required: ${oldDepositRequired} -> ${newDepositRequired}`,
  ]

  if (menuChanged) parts.push('đã thay đổi món ăn')
  if (serviceChanged) parts.push('đã thay đổi dịch vụ')
  if (selectedComboId) parts.push(`selected_combo_id: ${selectedComboId}`)

  return parts.join(' | ')
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idRaw } = await context.params
    const id = parseId(idRaw)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const response = await buildOrderResponse(id)

    if (!response) {
      return NextResponse.json(
        { message: 'Không tìm thấy order' },
        { status: 404 },
      )
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('GET /admin/api/order/[id] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Không thể tải chi tiết order' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idRaw } = await context.params
    const id = parseId(idRaw)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json()

    const previewOnly = !!body?.preview_only
    const nextStatusRaw = body?.status
    const selectedComboIdRaw = body?.selected_combo_id
    const menuItemsRaw = Array.isArray(body?.menu_items)
      ? body.menu_items
      : null
    const serviceItemsRaw = Array.isArray(body?.service_items)
      ? body.service_items
      : null

    let nextStatus: string | null = null
    if (typeof nextStatusRaw === 'string' && nextStatusRaw.trim()) {
      const status = nextStatusRaw.trim().toUpperCase()
      const ALLOWED = ['OPEN', 'CLOSED']

      if (!ALLOWED.includes(status)) {
        return NextResponse.json(
          { message: 'Trạng thái chỉ cho phép OPEN hoặc CLOSED' },
          { status: 400 },
        )
      }

      nextStatus = status
    }

    const existing = await prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: true,
        reservations: {
          include: {
            reservation_services: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { message: 'Không tìm thấy order' },
        { status: 404 },
      )
    }

    const currentMenuMap = new Map<number, number>()
    for (const item of existing.order_items) {
      currentMenuMap.set(item.menu_item_id, item.quantity || 0)
    }

    const currentServiceMap = new Map<number, number>()
    for (const item of existing.reservations?.reservation_services || []) {
      currentServiceMap.set(item.service_id, item.quantity || 0)
    }

    const nextMenuMap = new Map<number, number>()
    if (menuItemsRaw) {
      for (const raw of menuItemsRaw as EditMenuInput[]) {
        const menu_item_id = Number(raw?.menu_item_id)
        const remove = !!raw?.remove
        const quantity = remove ? 0 : Number(raw?.quantity ?? 0)

        if (!Number.isFinite(menu_item_id) || menu_item_id <= 0) continue
        nextMenuMap.set(menu_item_id, Math.max(0, Math.floor(quantity)))
      }
    } else {
      for (const [menu_item_id, quantity] of currentMenuMap.entries()) {
        nextMenuMap.set(menu_item_id, quantity)
      }
    }

    const nextServiceMap = new Map<number, number>()
    if (serviceItemsRaw) {
      for (const raw of serviceItemsRaw as EditServiceInput[]) {
        const service_id = Number(raw?.service_id)
        const remove = !!raw?.remove
        const quantity = remove ? 0 : Number(raw?.quantity ?? 0)

        if (!Number.isFinite(service_id) || service_id <= 0) continue
        nextServiceMap.set(service_id, Math.max(0, Math.floor(quantity)))
      }
    } else {
      for (const [service_id, quantity] of currentServiceMap.entries()) {
        nextServiceMap.set(service_id, quantity)
      }
    }

    const draftMenuItems: DraftMenuItem[] = Array.from(
      nextMenuMap.entries(),
    ).map(([menu_item_id, quantity]) => ({
      menu_item_id,
      quantity,
    }))

    const draftServiceItems: DraftServiceItem[] = Array.from(
      nextServiceMap.entries(),
    ).map(([service_id, quantity]) => ({
      service_id,
      quantity,
    }))

    const computed = await buildOrderResponse(id, {
      draftMenuItems,
      draftServiceItems,
      selectedComboId:
        selectedComboIdRaw == null ? null : Number(selectedComboIdRaw),
      draftStatus: nextStatus,
      previewOnly,
    })

    if (!computed) {
      return NextResponse.json(
        { message: 'Không tìm thấy order' },
        { status: 404 },
      )
    }

    if (previewOnly) {
      return NextResponse.json({
        message: 'Preview order thành công',
        data: computed,
        note: {
          preview_mode_supported: true,
          rule: 'PATCH với preview_only=true sẽ chỉ tính thử. Nếu đã có FINAL SUCCESS thì remaining_estimated = 0.',
        },
      })
    }

    const menuChanged =
      JSON.stringify(Array.from(currentMenuMap.entries()).sort()) !==
      JSON.stringify(Array.from(nextMenuMap.entries()).sort())

    const serviceChanged =
      JSON.stringify(Array.from(currentServiceMap.entries()).sort()) !==
      JSON.stringify(Array.from(nextServiceMap.entries()).sort())

    await prisma.$transaction(async (tx) => {
      if (menuItemsRaw) {
        const menuIds = Array.from(nextMenuMap.keys())
        const menuDefs = menuIds.length
          ? await tx.menu_items.findMany({
              where: { id: { in: menuIds } },
              select: { id: true, price: true },
            })
          : []

        const menuDefMap = toMapById(
          menuDefs.map((x: any) => ({
            id: x.id,
            price: safeDecimal(x.price),
          })),
        )

        const membershipDiscountPercent = safeDecimal(
          computed.user.membership_discount_percent,
        )
        const memberMultiplier = Math.max(
          0,
          1 - membershipDiscountPercent / 100,
        )

        for (const [menu_item_id, quantity] of nextMenuMap.entries()) {
          const existingOrderItem = existing.order_items.find(
            (x) => x.menu_item_id === menu_item_id,
          )

          if (quantity <= 0) {
            if (existingOrderItem) {
              await tx.order_items.delete({
                where: {
                  id: existingOrderItem.id,
                },
              })
            }
          } else {
            const basePrice = safeDecimal(menuDefMap.get(menu_item_id)?.price)
            const _discountedUnitPrice = roundMoney(
              basePrice * memberMultiplier,
            )

            if (existingOrderItem) {
              await tx.order_items.update({
                where: { id: existingOrderItem.id },
                data: { quantity },
              })
            } else {
              await tx.order_items.create({
                data: {
                  order_id: existing.id,
                  menu_item_id,
                  quantity,
                },
              })
            }
          }
        }
      }

      if (serviceItemsRaw) {
        const serviceIds = Array.from(nextServiceMap.keys())
        const serviceDefs = serviceIds.length
          ? await tx.services.findMany({
              where: { id: { in: serviceIds } },
              select: { id: true, price: true },
            })
          : []

        const serviceDefMap = toMapById(
          serviceDefs.map((x: any) => ({
            id: x.id,
            price: safeDecimal(x.price),
          })),
        )

        const membershipDiscountPercent = safeDecimal(
          computed.user.membership_discount_percent,
        )
        const memberMultiplier = Math.max(
          0,
          1 - membershipDiscountPercent / 100,
        )

        for (const [service_id, quantity] of nextServiceMap.entries()) {
          const existingReservationService =
            existing.reservations?.reservation_services?.find(
              (x) => x.service_id === service_id,
            )

          if (quantity <= 0) {
            if (existingReservationService) {
              await tx.reservation_services.delete({
                where: {
                  reservation_id_service_id: {
                    reservation_id: existing.reservation_id,
                    service_id,
                  },
                },
              })
            }
          } else {
            const basePrice = safeDecimal(serviceDefMap.get(service_id)?.price)
            const discountedUnitPrice = roundMoney(basePrice * memberMultiplier)

            if (existingReservationService) {
              await tx.reservation_services.update({
                where: {
                  reservation_id_service_id: {
                    reservation_id: existing.reservation_id,
                    service_id,
                  },
                },
                data: {
                  quantity,
                  unit_price: discountedUnitPrice,
                },
              })
            } else {
              await tx.reservation_services.create({
                data: {
                  reservation_id: existing.reservation_id,
                  service_id,
                  quantity,
                  unit_price: discountedUnitPrice,
                },
              })
            }
          }
        }
      }

      await tx.orders.update({
        where: { id: existing.id },
        data: {
          grand_total: computed.grand_total,
          deposit_required: computed.deposit_required,
          ...(nextStatus ? { status: nextStatus } : {}),
        },
      })

      const actorUserIdRaw =
        req.cookies.get('web_user_id')?.value ??
        req.cookies.get('user_id')?.value
      const actorUserId = Number(actorUserIdRaw)

      if (Number.isFinite(actorUserId) && actorUserId > 0) {
        await tx.audit_logs.create({
          data: {
            entity: 'orders',
            entity_id: existing.id,
            action: 'UPDATE',
            description: buildAuditDescription({
              orderId: existing.id,
              oldStatus: existing.status,
              newStatus: nextStatus || existing.status,
              oldGrandTotal: safeDecimal(existing.grand_total),
              newGrandTotal: safeDecimal(computed.grand_total),
              oldDepositRequired: safeDecimal(existing.deposit_required),
              newDepositRequired: safeDecimal(computed.deposit_required),
              menuChanged,
              serviceChanged,
              selectedComboId:
                selectedComboIdRaw == null ? null : Number(selectedComboIdRaw),
            }),
            user_id: Math.floor(actorUserId),
          },
        })
      }
    })

    const response = await buildOrderResponse(id, {
      selectedComboId:
        selectedComboIdRaw == null ? null : Number(selectedComboIdRaw),
    })

    return NextResponse.json({
      message: 'Cập nhật order thành công',
      data: response,
      note: {
        preview_mode_supported: true,
        rule: 'PATCH với preview_only=true sẽ chỉ tính thử. Số lượng tối thiểu là 1, muốn bỏ item thì gửi remove=true hoặc quantity=0. Nếu đã có FINAL SUCCESS thì remaining_estimated = 0.',
      },
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/order/[id] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Không thể cập nhật order' },
      { status: 500 },
    )
  }
}
