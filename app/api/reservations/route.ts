import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HOLD_MINUTES = 180 // reservation_endtime = reservation_time + 180 phút

// ✅ chỉ cho reservation_time trong 07:30–20:30
const OPEN_HOUR = 7
const OPEN_MINUTE = 30
const CLOSE_HOUR = 20
const CLOSE_MINUTE = 30

type Mode = 'auto' | 'manual'

type Body = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  table_type_id?: number
  mode?: Mode

  // manual:
  table_ids?: number[]

  // option:
  allow_combine?: boolean // default true
  create_order?: boolean // default true

  // selections:
  items?: { menu_item_id: number; quantity: number }[]
  services?: { service_id: number; quantity: number }[]
  combos?: { combo_id: number; quantity: number }[]
}

type Tx = Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => any
  ? T
  : never

const isDev = process.env.NODE_ENV === 'development'

function errWithStatus(message: string, statusCode: number, extra?: any) {
  return Object.assign(new Error(message), { statusCode, ...extra })
}

function isWithinBusinessHours(d: Date) {
  const minutes = d.getHours() * 60 + d.getMinutes()
  const open = OPEN_HOUR * 60 + OPEN_MINUTE
  const close = CLOSE_HOUR * 60 + CLOSE_MINUTE
  return minutes >= open && minutes <= close
}

async function getBusyTableIds(tx: Tx, start: Date, end: Date) {
  const busy = await tx.reservation_tables.findMany({
    where: {
      reservations: {
        status: { in: ['pending', 'confirmed'] },
        reservation_time: { lt: end },
        reservation_endtime: { gt: start },
      },
    },
    select: { table_id: true },
  })
  return new Set(busy.map((x) => x.table_id))
}

function pickAutoTables(
  tables: { id: number; capacity: number }[],
  guests: number,
  allowCombine: boolean,
) {
  const one = tables.find((t) => t.capacity >= guests)
  if (one) return [one]

  if (!allowCombine) return []

  let cap = 0
  const chosen: { id: number; capacity: number }[] = []
  for (const t of tables) {
    chosen.push(t)
    cap += t.capacity
    if (cap >= guests) break
  }
  if (cap < guests) return []
  return chosen
}

// ===== helpers for expanding combo -> items/services =====
function addQty(map: Map<number, number>, id: number, qty: number) {
  const i = Number(id)
  const q = Number(qty)
  if (!i || q <= 0) return
  map.set(i, (map.get(i) ?? 0) + q)
}

function normalizeArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

// Prisma Decimal may be string / object / Decimal.js-like
function toNumberDecimal(v: any) {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  if (typeof v?.toNumber === 'function') return v.toNumber()
  return Number(v) || 0
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>

    const userId = Number(body.user_id)
    const guests = Number(body.number_of_guests)
    const start = new Date(String(body.reservation_time))

    const mode: Mode = (body.mode ?? 'auto') as Mode
    const allowCombine = body.allow_combine ?? true
    const createOrderFlag = body.create_order ?? true

    if (!userId || !guests || guests <= 0 || isNaN(start.getTime())) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
    }

    if (start.getTime() < Date.now()) {
      return NextResponse.json(
        { message: 'Reservation time must be in the future' },
        { status: 400 },
      )
    }

    if (!isWithinBusinessHours(start)) {
      return NextResponse.json(
        { message: 'Reservation time must be between 07:30 and 20:30' },
        { status: 400 },
      )
    }

    const end = new Date(start.getTime() + HOLD_MINUTES * 60 * 1000)
    const tableTypeId = body.table_type_id ? Number(body.table_type_id) : null

    // selections
    const itemsInput = normalizeArray<{
      menu_item_id: number
      quantity: number
    }>(body.items)

    const servicesInput = normalizeArray<{
      service_id: number
      quantity: number
    }>(body.services)

    const combosInput = normalizeArray<{ combo_id: number; quantity: number }>(
      body.combos,
    )

    const result = await prisma.$transaction(
      async (tx) => {
        // 0) ensure user exists
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true },
        })
        if (!user) throw errWithStatus('USER_NOT_FOUND', 404)

        // 1) busy ids
        const busyIds = await getBusyTableIds(tx, start, end)

        // 2) load tables active (+ optional type)
        const allActive = await tx.restaurant_tables.findMany({
          where: {
            is_active: true,
            ...(tableTypeId ? { table_type_id: tableTypeId } : {}),
          },
          select: { id: true, capacity: true, table_type_id: true },
          orderBy: [{ capacity: 'asc' }, { id: 'asc' }],
        })

        const free = allActive.filter((t) => !busyIds.has(t.id))

        // 3) choose tables
        let chosen: { id: number; capacity: number }[] = []

        if (mode === 'manual') {
          const ids = (body.table_ids ?? []).map(Number).filter(Boolean)
          if (!ids.length) throw errWithStatus('MANUAL_TABLE_REQUIRED', 400)

          const picked = free.filter((t) => ids.includes(t.id))
          if (picked.length !== ids.length)
            throw errWithStatus('TABLE_NOT_AVAILABLE', 409)

          const sumCap = picked.reduce((s, t) => s + t.capacity, 0)
          if (sumCap < guests) throw errWithStatus('NOT_ENOUGH_CAPACITY', 409)

          if (!allowCombine) {
            const one = picked.find((t) => t.capacity >= guests)
            if (!one) throw errWithStatus('REQUIRE_SINGLE_TABLE', 409)
            chosen = [one]
          } else {
            let cap = 0
            for (const t of picked.sort(
              (a, b) => a.capacity - b.capacity || a.id - b.id,
            )) {
              chosen.push({ id: t.id, capacity: t.capacity })
              cap += t.capacity
              if (cap >= guests) break
            }
          }
        } else {
          chosen = pickAutoTables(
            free.map((t) => ({ id: t.id, capacity: t.capacity })),
            guests,
            allowCombine,
          )
          if (!chosen.length) throw errWithStatus('NO_AVAILABLE_TABLES', 409)
        }

        // 4) create reservation
        let reservation: any
        try {
          reservation = await tx.reservations.create({
            data: {
              user_id: userId,
              reservation_time: start,
              reservation_endtime: end,
              number_of_guests: guests,
              status: 'pending',
            },
          })
        } catch (e: any) {
          throw errWithStatus('FAIL_CREATE_RESERVATION', 500, { cause: e })
        }

        // 5) assign tables
        try {
          await tx.reservation_tables.createMany({
            data: chosen.map((t) => ({
              reservation_id: reservation.id,
              table_id: t.id,
            })),
          })
        } catch (e: any) {
          throw errWithStatus('FAIL_ASSIGN_TABLES', 500, { cause: e })
        }

        // ===== 6) EXPAND combos -> final items/services =====
        const menuQty = new Map<number, number>()
        const serviceQty = new Map<number, number>()

        // merge manual picks
        for (const it of itemsInput)
          addQty(menuQty, it.menu_item_id, it.quantity)
        for (const sv of servicesInput)
          addQty(serviceQty, sv.service_id, sv.quantity)

        if (combosInput.length) {
          const comboIds = combosInput
            .map((c) => Number(c.combo_id))
            .filter(Boolean)

          const comboRows = await tx.combo.findMany({
            where: { id: { in: comboIds }, is_active: true },
            select: {
              id: true,
              combo_menu_items: {
                select: { menu_item_id: true, quantity: true },
              },
              combo_services: { select: { service_id: true, quantity: true } },
            },
          })

          const qtyByComboId = new Map<number, number>()
          for (const c of combosInput) {
            const id = Number(c.combo_id)
            const q = Number(c.quantity ?? 1)
            if (id && q > 0) qtyByComboId.set(id, q)
          }

          if (comboRows.length !== qtyByComboId.size) {
            throw errWithStatus('COMBO_NOT_FOUND_OR_INACTIVE', 400)
          }

          for (const c of comboRows) {
            const comboQty = qtyByComboId.get(c.id) ?? 1

            for (const cm of c.combo_menu_items) {
              addQty(
                menuQty,
                cm.menu_item_id,
                comboQty * Number(cm.quantity ?? 1),
              )
            }
            for (const cs of c.combo_services) {
              addQty(
                serviceQty,
                cs.service_id,
                comboQty * Number(cs.quantity ?? 1),
              )
            }
          }
        }

        const finalOrderItems = Array.from(menuQty.entries()).map(
          ([menu_item_id, quantity]) => ({ menu_item_id, quantity }),
        )

        const finalReservationServices = Array.from(serviceQty.entries()).map(
          ([service_id, quantity]) => ({ service_id, quantity }),
        )

        // ✅ FIX: service-only cũng phải tạo order
        const hasSelections =
          finalOrderItems.length > 0 || finalReservationServices.length > 0
        const shouldCreateOrder = createOrderFlag || hasSelections

        // ===== 7) create order + order_items =====
        let order: any = null

        if (shouldCreateOrder) {
          try {
            order = await tx.orders.create({
              data: {
                reservation_id: reservation.id,
                user_id: userId,
                status: 'OPEN',
                grand_total: 0,
                deposit_required: 0,
              },
            })
          } catch (e: any) {
            throw errWithStatus('FAIL_CREATE_ORDER', 500, { cause: e })
          }
        }

        if (order && finalOrderItems.length) {
          try {
            await tx.order_items.createMany({
              data: finalOrderItems.map((x) => ({
                order_id: order.id,
                menu_item_id: x.menu_item_id,
                quantity: x.quantity,
              })),
            })
          } catch (e: any) {
            throw errWithStatus('FAIL_CREATE_ORDER_ITEMS', 500, { cause: e })
          }
        }

        // ===== 8) create reservation_services =====
        let servicePriceMap = new Map<number, any>()

        if (finalReservationServices.length) {
          try {
            const ids = finalReservationServices.map((x) => x.service_id)
            const priceRows = await tx.services.findMany({
              where: { id: { in: ids } },
              select: { id: true, price: true },
            })
            servicePriceMap = new Map(priceRows.map((s) => [s.id, s.price]))

            await tx.reservation_services.createMany({
              data: finalReservationServices.map((x) => ({
                reservation_id: reservation.id,
                service_id: x.service_id,
                quantity: x.quantity,
                unit_price: servicePriceMap.get(x.service_id) ?? 0,
              })),
            })
          } catch (e: any) {
            throw errWithStatus('FAIL_CREATE_RESERVATION_SERVICES', 500, {
              cause: e,
            })
          }
        }

        // ===== 9) compute grand_total + deposit_required & update order =====
        if (order) {
          // menu total
          let menuTotal = 0
          if (finalOrderItems.length) {
            const menuIds = finalOrderItems.map((x) => x.menu_item_id)
            const menuRows = await tx.menu_items.findMany({
              where: { id: { in: menuIds } },
              select: { id: true, price: true },
            })
            const menuPriceMap = new Map(menuRows.map((m) => [m.id, m.price]))

            for (const it of finalOrderItems) {
              const price = toNumberDecimal(
                menuPriceMap.get(it.menu_item_id) ?? 0,
              )
              menuTotal += price * Number(it.quantity ?? 0)
            }
          }

          // services total
          let serviceTotal = 0
          if (finalReservationServices.length) {
            for (const sv of finalReservationServices) {
              const price = toNumberDecimal(
                servicePriceMap.get(sv.service_id) ?? 0,
              )
              serviceTotal += price * Number(sv.quantity ?? 0)
            }
          }

          const grandTotal = menuTotal + serviceTotal

          // ✅ deposit_required DECIMAL(18,0) => làm tròn trước khi lưu
          const depositRequired = hasSelections
            ? Math.round(grandTotal * 0.5)
            : 0

          order = await tx.orders.update({
            where: { id: order.id },
            data: {
              grand_total: grandTotal,
              deposit_required: depositRequired,
            },
          })
        }

        // ✅ Return thêm order_id + payment_url để FE redirect
        return {
          reservation,
          order,
          order_id: order?.id ?? null,
          need_payment: Boolean(
            order && Number(order.deposit_required ?? 0) > 0,
          ),
          payment_url: order ? `/payment?order_id=${order.id}` : null,

          table_ids: chosen.map((t) => t.id),
          mode,
          items_count: finalOrderItems.reduce((s, x) => s + x.quantity, 0),
          services_count: finalReservationServices.reduce(
            (s, x) => s + x.quantity,
            0,
          ),
        }
      },
      { isolationLevel: 'Serializable' },
    )

    return NextResponse.json(
      { message: 'Reservation created', ...result },
      { status: 201 },
    )
  } catch (err: any) {
    console.error('POST /api/reservations ERROR:', err)
    if (err?.cause) console.error('CAUSE:', err.cause)

    const msg = String(err?.message ?? 'Something went wrong')
    const statusCode = Number(err?.statusCode ?? 500)

    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    if (msg === 'MANUAL_TABLE_REQUIRED') {
      return NextResponse.json(
        { message: 'table_ids is required in manual mode' },
        { status: 400 },
      )
    }
    if (msg === 'TABLE_NOT_AVAILABLE') {
      return NextResponse.json(
        { message: 'Some tables are not available' },
        { status: 409 },
      )
    }
    if (msg === 'NOT_ENOUGH_CAPACITY') {
      return NextResponse.json(
        { message: 'Selected tables not enough capacity' },
        { status: 409 },
      )
    }
    if (msg === 'REQUIRE_SINGLE_TABLE') {
      return NextResponse.json(
        { message: 'Need a single table that fits all guests' },
        { status: 409 },
      )
    }
    if (msg === 'NO_AVAILABLE_TABLES') {
      return NextResponse.json(
        { message: 'No available tables for this time' },
        { status: 409 },
      )
    }

    if (msg === 'COMBO_NOT_FOUND_OR_INACTIVE') {
      return NextResponse.json(
        { message: 'Combo not found or inactive' },
        { status: 400 },
      )
    }

    if (msg === 'FAIL_CREATE_RESERVATION') {
      return NextResponse.json(
        {
          message: 'Failed to create reservation',
          prismaCode: err?.cause?.code,
          detail: isDev
            ? String(err?.cause?.message ?? err?.message)
            : undefined,
        },
        { status: statusCode },
      )
    }

    if (msg === 'FAIL_ASSIGN_TABLES') {
      return NextResponse.json(
        {
          message: 'Failed to assign tables',
          prismaCode: err?.cause?.code,
          detail: isDev
            ? String(err?.cause?.message ?? err?.message)
            : undefined,
        },
        { status: statusCode },
      )
    }

    if (msg === 'FAIL_CREATE_ORDER') {
      return NextResponse.json(
        {
          message: 'Failed to create order',
          prismaCode: err?.cause?.code,
          detail: isDev
            ? String(err?.cause?.message ?? err?.message)
            : undefined,
        },
        { status: statusCode },
      )
    }

    if (msg === 'FAIL_CREATE_ORDER_ITEMS') {
      return NextResponse.json(
        {
          message: 'Failed to create order items',
          prismaCode: err?.cause?.code,
          detail: isDev
            ? String(err?.cause?.message ?? err?.message)
            : undefined,
        },
        { status: statusCode },
      )
    }

    if (msg === 'FAIL_CREATE_RESERVATION_SERVICES') {
      return NextResponse.json(
        {
          message: 'Failed to create reservation services',
          prismaCode: err?.cause?.code,
          detail: isDev
            ? String(err?.cause?.message ?? err?.message)
            : undefined,
        },
        { status: statusCode },
      )
    }

    return NextResponse.json(
      {
        message: isDev ? msg : 'Something went wrong',
        prismaCode: err?.code,
        detail: isDev ? String(err?.cause?.message ?? '') : undefined,
      },
      { status: statusCode },
    )
  }
}
