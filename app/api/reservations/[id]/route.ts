import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HOLD_MINUTES = 180

const OPEN_HOUR = 7
const OPEN_MINUTE = 30
const CLOSE_HOUR = 20
const CLOSE_MINUTE = 30

type Body = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  table_type_id?: number
  table_ids?: number[]
  table_count?: number
  allow_combine?: boolean
  create_order?: boolean

  items?: { menu_item_id: number; quantity: number }[]
  services?: { service_id: number; quantity: number }[]
  combos?: { combo_id: number; quantity: number }[]
}

type RouteContext = {
  params: Promise<{ id: string }>
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

function roundMoney(v: number) {
  return Number(v.toFixed(2))
}

function normalizeArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function toNumberDecimal(v: any) {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  if (typeof v?.toNumber === 'function') return v.toNumber()
  return Number(v) || 0
}

function isFreeDepositByMemberPoint(memberPoint: any) {
  return toNumberDecimal(memberPoint) >= 20000000
}

async function getBusyTableIds(
  tx: Tx,
  start: Date,
  end: Date,
  excludeReservationId?: number,
) {
  const busy = await tx.reservation_tables.findMany({
    where: {
      reservations: {
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        status: { in: ['pending', 'confirmed', 'PENDING', 'CONFIRMED'] },
        reservation_time: { lt: end },
        reservation_endtime: { gt: start },
      },
    },
    select: { table_id: true },
  })

  return new Set(busy.map((x) => x.table_id))
}

function pickAutoTablesByCount(
  tables: { id: number; capacity: number }[],
  guests: number,
  allowCombine: boolean,
  tableCount: number,
) {
  const safeCount = Math.max(1, Number(tableCount) || 1)
  const sorted = [...tables].sort(
    (a, b) => a.capacity - b.capacity || a.id - b.id,
  )

  if (safeCount === 1) {
    const one = sorted.find((t) => t.capacity >= guests)
    return one ? [one] : []
  }

  if (!allowCombine) return []

  const chosen: { id: number; capacity: number }[] = []
  let cap = 0

  for (const t of sorted) {
    chosen.push(t)
    cap += t.capacity
    if (chosen.length === safeCount) break
  }

  if (chosen.length !== safeCount) return []
  if (cap < guests) return []

  return chosen
}

function pickRequestedTables(
  tables: { id: number; capacity: number }[],
  requestedIds: number[],
  guests: number,
  allowCombine: boolean,
  tableCount: number,
) {
  const safeCount = Math.max(1, Number(tableCount) || requestedIds.length || 1)

  const picked = tables.filter((t) => requestedIds.includes(t.id))
  if (picked.length !== requestedIds.length) {
    throw errWithStatus('TABLE_NOT_AVAILABLE', 409)
  }

  if (requestedIds.length !== safeCount) {
    throw errWithStatus('TABLE_COUNT_MISMATCH', 400)
  }

  const sumCap = picked.reduce((s, t) => s + t.capacity, 0)
  if (sumCap < guests) {
    throw errWithStatus('NOT_ENOUGH_CAPACITY', 409)
  }

  if (safeCount > 1 && !allowCombine) {
    throw errWithStatus('MULTI_TABLE_NOT_ALLOWED', 409)
  }

  if (safeCount === 1) {
    const one = picked.find((t) => t.capacity >= guests)
    if (!one) throw errWithStatus('REQUIRE_SINGLE_TABLE', 409)
    return [one]
  }

  const sorted = [...picked].sort(
    (a, b) => a.capacity - b.capacity || a.id - b.id,
  )

  return sorted
    .slice(0, safeCount)
    .map((t) => ({ id: t.id, capacity: t.capacity }))
}

function addQty(map: Map<number, number>, id: number, qty: number) {
  const i = Number(id)
  const q = Number(qty)
  if (!i || q <= 0) return
  map.set(i, (map.get(i) ?? 0) + q)
}

function setQty(map: Map<number, number>, id: number, qty: number) {
  const i = Number(id)
  const q = Number(qty)
  if (!i) return
  if (q <= 0) {
    map.delete(i)
    return
  }
  map.set(i, q)
}

function getQty(map: Map<number, number>, id: number) {
  return Number(map.get(Number(id)) ?? 0)
}

function validateNotBelowCovered(
  submittedMap: Map<number, number>,
  coveredMap: Map<number, number>,
  type: 'menu' | 'service',
) {
  for (const [id, coveredQty] of coveredMap.entries()) {
    const submittedQty = getQty(submittedMap, id)
    if (submittedQty < coveredQty) {
      if (type === 'menu') {
        throw errWithStatus('ITEM_QTY_BELOW_COMBO', 400, {
          itemId: id,
          minQty: coveredQty,
          submittedQty,
        })
      }
      throw errWithStatus('SERVICE_QTY_BELOW_COMBO', 400, {
        serviceId: id,
        minQty: coveredQty,
        submittedQty,
      })
    }
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const reservationId = Number(id)
    const body = (await req.json()) as Partial<Body>

    const userId = Number(body.user_id)
    const guests = Number(body.number_of_guests)
    const start = new Date(String(body.reservation_time))

    const allowCombine = body.allow_combine ?? true
    const createOrderFlag = body.create_order ?? true
    const tableCount = Math.max(1, Number(body.table_count ?? 1) || 1)

    if (
      !reservationId ||
      !userId ||
      !guests ||
      guests <= 0 ||
      isNaN(start.getTime())
    ) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ' },
        { status: 400 },
      )
    }

    if (start.getTime() < Date.now()) {
      return NextResponse.json(
        { message: 'Thời gian đặt bàn phải lớn hơn thời điểm hiện tại' },
        { status: 400 },
      )
    }

    if (!isWithinBusinessHours(start)) {
      return NextResponse.json(
        { message: 'Thời gian đặt bàn phải nằm trong khung 07:30 đến 20:30' },
        { status: 400 },
      )
    }

    if (!allowCombine && tableCount > 1) {
      return NextResponse.json(
        {
          message:
            'Không thể chọn nhiều bàn khi allow_combine được đặt là false',
        },
        { status: 400 },
      )
    }

    const end = new Date(start.getTime() + HOLD_MINUTES * 60 * 1000)
    const tableTypeId = body.table_type_id ? Number(body.table_type_id) : null

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
        const existingReservation = await tx.reservations.findUnique({
          where: { id: reservationId },
          include: {
            reservation_tables: true,
            reservation_services: true,
            orders: {
              include: {
                order_items: true,
                payments: true,
              },
            },
          },
        })

        if (!existingReservation) {
          throw errWithStatus('RESERVATION_NOT_FOUND', 404)
        }

        const reservationStatus = String(
          existingReservation.status ?? '',
        ).toUpperCase()
        if (reservationStatus !== 'PENDING') {
          throw errWithStatus('ONLY_PENDING_CAN_EDIT', 409)
        }

        if (Number(existingReservation.user_id) !== userId) {
          throw errWithStatus('USER_RESERVATION_MISMATCH', 400)
        }

        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            member_point: true,
            membership_id: true,
            membership: {
              select: {
                id: true,
                code: true,
                name: true,
                min_point: true,
                discount_percent: true,
              },
            },
          },
        })

        if (!user) throw errWithStatus('USER_NOT_FOUND', 404)

        const membershipDiscountPercent = Number(
          user.membership?.discount_percent ?? 0,
        )
        const membershipMinPoint = toNumberDecimal(
          user.membership?.min_point ?? 0,
        )
        const userMemberPoint = toNumberDecimal(user.member_point ?? 0)

        const freeDeposit = isFreeDepositByMemberPoint(userMemberPoint)

        const busyIds = await getBusyTableIds(tx, start, end, reservationId)

        const allActive = await tx.restaurant_tables.findMany({
          where: {
            is_active: true,
            ...(tableTypeId ? { table_type_id: tableTypeId } : {}),
          },
          select: { id: true, capacity: true, table_type_id: true },
          orderBy: [{ capacity: 'asc' }, { id: 'asc' }],
        })

        const free = allActive.filter((t) => !busyIds.has(t.id))
        let chosen: { id: number; capacity: number }[] = []

        const requestedIds = (body.table_ids ?? []).map(Number).filter(Boolean)

        if (requestedIds.length > 0) {
          chosen = pickRequestedTables(
            free.map((t) => ({ id: t.id, capacity: t.capacity })),
            requestedIds,
            guests,
            allowCombine,
            tableCount,
          )
        } else {
          chosen = pickAutoTablesByCount(
            free.map((t) => ({ id: t.id, capacity: t.capacity })),
            guests,
            allowCombine,
            tableCount,
          )
          if (!chosen.length) throw errWithStatus('NO_AVAILABLE_TABLES', 409)
        }

        const submittedMenuQty = new Map<number, number>()
        const submittedServiceQty = new Map<number, number>()

        for (const it of itemsInput) {
          setQty(
            submittedMenuQty,
            Number(it.menu_item_id),
            Number(it.quantity ?? 0),
          )
        }

        for (const sv of servicesInput) {
          setQty(
            submittedServiceQty,
            Number(sv.service_id),
            Number(sv.quantity ?? 0),
          )
        }

        const comboCoveredMenuQty = new Map<number, number>()
        const comboCoveredServiceQty = new Map<number, number>()
        let comboTotal = 0

        if (combosInput.length) {
          const comboIds = combosInput
            .map((c) => Number(c.combo_id))
            .filter(Boolean)

          const comboRows = await tx.combo.findMany({
            where: { id: { in: comboIds }, is_active: true },
            select: {
              id: true,
              sale_price: true,
              combo_menu_items: {
                select: { menu_item_id: true, quantity: true },
              },
              combo_services: {
                select: { service_id: true, quantity: true },
              },
            },
          })

          const qtyByComboId = new Map<number, number>()
          for (const c of combosInput) {
            const comboId = Number(c.combo_id)
            const comboQty = Number(c.quantity ?? 1)
            if (comboId && comboQty > 0) qtyByComboId.set(comboId, comboQty)
          }

          if (comboRows.length !== qtyByComboId.size) {
            throw errWithStatus('COMBO_NOT_FOUND_OR_INACTIVE', 400)
          }

          for (const c of comboRows) {
            const comboQty = qtyByComboId.get(c.id) ?? 1

            comboTotal += toNumberDecimal(c.sale_price ?? 0) * comboQty

            for (const cm of c.combo_menu_items) {
              addQty(
                comboCoveredMenuQty,
                cm.menu_item_id,
                comboQty * Number(cm.quantity ?? 1),
              )
            }

            for (const cs of c.combo_services) {
              addQty(
                comboCoveredServiceQty,
                cs.service_id,
                comboQty * Number(cs.quantity ?? 1),
              )
            }
          }
        }

        validateNotBelowCovered(submittedMenuQty, comboCoveredMenuQty, 'menu')
        validateNotBelowCovered(
          submittedServiceQty,
          comboCoveredServiceQty,
          'service',
        )

        const finalMenuQty = submittedMenuQty
        const finalServiceQty = submittedServiceQty

        const finalOrderItems = Array.from(finalMenuQty.entries()).map(
          ([menu_item_id, quantity]) => ({ menu_item_id, quantity }),
        )

        const finalReservationServices = Array.from(
          finalServiceQty.entries(),
        ).map(([service_id, quantity]) => ({ service_id, quantity }))

        const hasSelections =
          finalOrderItems.length > 0 ||
          finalReservationServices.length > 0 ||
          combosInput.length > 0

        const shouldCreateOrder = createOrderFlag || hasSelections

        let reservation: any
        try {
          reservation = await tx.reservations.update({
            where: { id: reservationId },
            data: {
              reservation_time: start,
              reservation_endtime: end,
              number_of_guests: guests,
            },
          })
        } catch (e: any) {
          throw errWithStatus('FAIL_UPDATE_RESERVATION', 500, { cause: e })
        }

        try {
          await tx.reservation_tables.deleteMany({
            where: { reservation_id: reservationId },
          })

          await tx.reservation_tables.createMany({
            data: chosen.map((t) => ({
              reservation_id: reservationId,
              table_id: t.id,
            })),
          })
        } catch (e: any) {
          throw errWithStatus('FAIL_ASSIGN_TABLES', 500, { cause: e })
        }

        let order: any = existingReservation.orders?.[0] ?? null

        if (!order && shouldCreateOrder) {
          try {
            order = await tx.orders.create({
              data: {
                reservation_id: reservationId,
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

        if (order) {
          try {
            await tx.order_items.deleteMany({
              where: { order_id: order.id },
            })

            if (finalOrderItems.length) {
              await tx.order_items.createMany({
                data: finalOrderItems.map((x) => ({
                  order_id: order.id,
                  menu_item_id: x.menu_item_id,
                  quantity: x.quantity,
                })),
              })
            }
          } catch (e: any) {
            throw errWithStatus('FAIL_CREATE_ORDER_ITEMS', 500, { cause: e })
          }
        }

        let servicePriceMap = new Map<number, any>()

        try {
          await tx.reservation_services.deleteMany({
            where: { reservation_id: reservationId },
          })

          if (finalReservationServices.length) {
            const ids = finalReservationServices.map((x) => x.service_id)
            const priceRows = await tx.services.findMany({
              where: { id: { in: ids } },
              select: { id: true, price: true },
            })
            servicePriceMap = new Map(priceRows.map((s) => [s.id, s.price]))

            await tx.reservation_services.createMany({
              data: finalReservationServices.map((x) => ({
                reservation_id: reservationId,
                service_id: x.service_id,
                quantity: x.quantity,
                unit_price: servicePriceMap.get(x.service_id) ?? 0,
              })),
            })
          }
        } catch (e: any) {
          throw errWithStatus('FAIL_CREATE_RESERVATION_SERVICES', 500, {
            cause: e,
          })
        }

        let subtotal = 0
        let discountAmount = 0
        let grandTotal = 0
        let depositRequired = 0

        if (order) {
          let extraMenuTotal = 0
          if (finalMenuQty.size > 0) {
            const menuIds = Array.from(finalMenuQty.keys())
            const menuRows = await tx.menu_items.findMany({
              where: { id: { in: menuIds } },
              select: { id: true, price: true },
            })
            const menuPriceMap = new Map(menuRows.map((m) => [m.id, m.price]))

            for (const [menuItemId, submittedQty] of finalMenuQty.entries()) {
              const coveredQty = getQty(comboCoveredMenuQty, menuItemId)
              const extraQty = Math.max(0, Number(submittedQty) - coveredQty)
              if (extraQty <= 0) continue

              const price = toNumberDecimal(menuPriceMap.get(menuItemId) ?? 0)
              extraMenuTotal += price * extraQty
            }
          }

          let extraServiceTotal = 0
          if (finalServiceQty.size > 0) {
            const submittedServiceIds = Array.from(finalServiceQty.keys())

            const missingIds = submittedServiceIds.filter(
              (id) => !servicePriceMap.has(id),
            )

            if (missingIds.length) {
              const extraRows = await tx.services.findMany({
                where: { id: { in: missingIds } },
                select: { id: true, price: true },
              })
              for (const row of extraRows) {
                servicePriceMap.set(row.id, row.price)
              }
            }

            for (const [serviceId, submittedQty] of finalServiceQty.entries()) {
              const coveredQty = getQty(comboCoveredServiceQty, serviceId)
              const extraQty = Math.max(0, Number(submittedQty) - coveredQty)
              if (extraQty <= 0) continue

              const price = toNumberDecimal(servicePriceMap.get(serviceId) ?? 0)
              extraServiceTotal += price * extraQty
            }
          }

          subtotal = roundMoney(comboTotal + extraMenuTotal + extraServiceTotal)
          discountAmount = roundMoney(
            subtotal * (membershipDiscountPercent / 100),
          )
          grandTotal = roundMoney(Math.max(0, subtotal - discountAmount))

          depositRequired = hasSelections
            ? freeDeposit
              ? 0
              : roundMoney(grandTotal * 0.5)
            : 0

          order = await tx.orders.update({
            where: { id: order.id },
            data: {
              grand_total: grandTotal,
              deposit_required: depositRequired,
            },
          })
        }

        return {
          reservation,
          order,
          order_id: order?.id ?? null,
          need_payment: Boolean(
            order && Number(order.deposit_required ?? 0) > 0,
          ),
          payment_url:
            order && Number(order.deposit_required ?? 0) > 0
              ? `/payment?order_id=${order.id}`
              : null,
          table_count: chosen.length,
          table_ids: chosen.map((t) => t.id),
          items_count: finalOrderItems.reduce((s, x) => s + x.quantity, 0),
          services_count: finalReservationServices.reduce(
            (s, x) => s + x.quantity,
            0,
          ),
          member_point: userMemberPoint,
          membership: user.membership
            ? {
                id: user.membership.id,
                code: user.membership.code,
                name: user.membership.name,
                min_point: user.membership.min_point,
                discount_percent: user.membership.discount_percent,
              }
            : null,
          pricing: {
            subtotal,
            membership_min_point: membershipMinPoint,
            membership_discount_percent: membershipDiscountPercent,
            discount_amount: discountAmount,
            grand_total: grandTotal,
            deposit_required: depositRequired,
            free_deposit: freeDeposit,
          },
        }
      },
      { isolationLevel: 'Serializable' },
    )

    return NextResponse.json(
      { message: 'Cập nhật đặt bàn thành công', ...result },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('PUT /api/reservations/[id] LỖI:', err)
    if (err?.cause) console.error('NGUYÊN NHÂN:', err.cause)

    const msg = String(err?.message ?? 'Đã xảy ra lỗi')
    const statusCode = Number(err?.statusCode ?? 500)

    if (msg === 'RESERVATION_NOT_FOUND') {
      return NextResponse.json(
        { message: 'Không tìm thấy đặt bàn' },
        { status: 404 },
      )
    }

    if (msg === 'ONLY_PENDING_CAN_EDIT') {
      return NextResponse.json(
        { message: 'Chỉ được chỉnh sửa đặt bàn có trạng thái PENDING' },
        { status: 409 },
      )
    }

    if (msg === 'USER_RESERVATION_MISMATCH') {
      return NextResponse.json(
        { message: 'Đặt bàn này không thuộc về người dùng đã gửi lên' },
        { status: 400 },
      )
    }

    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 },
      )
    }

    if (msg === 'TABLE_NOT_AVAILABLE') {
      return NextResponse.json(
        { message: 'Một số bàn đã chọn hiện không còn trống' },
        { status: 409 },
      )
    }

    if (msg === 'TABLE_COUNT_MISMATCH') {
      return NextResponse.json(
        { message: 'Số lượng bàn đã chọn không khớp với table_count' },
        { status: 400 },
      )
    }

    if (msg === 'MULTI_TABLE_NOT_ALLOWED') {
      return NextResponse.json(
        { message: 'Không được phép chọn nhiều bàn' },
        { status: 409 },
      )
    }

    if (msg === 'NOT_ENOUGH_CAPACITY') {
      return NextResponse.json(
        { message: 'Tổng sức chứa của các bàn đã chọn không đủ' },
        { status: 409 },
      )
    }

    if (msg === 'REQUIRE_SINGLE_TABLE') {
      return NextResponse.json(
        { message: 'Cần một bàn đơn có đủ sức chứa cho toàn bộ khách' },
        { status: 409 },
      )
    }

    if (msg === 'NO_AVAILABLE_TABLES') {
      return NextResponse.json(
        {
          message:
            'Không còn bàn trống phù hợp với thời gian và số lượng bàn yêu cầu',
        },
        { status: 409 },
      )
    }

    if (msg === 'COMBO_NOT_FOUND_OR_INACTIVE') {
      return NextResponse.json(
        { message: 'Combo không tồn tại hoặc đang ngừng hoạt động' },
        { status: 400 },
      )
    }

    if (msg === 'ITEM_QTY_BELOW_COMBO') {
      return NextResponse.json(
        {
          message:
            'Số lượng món ăn trên form không được nhỏ hơn số lượng tối thiểu do combo áp dụng',
          item_id: err?.itemId,
          min_qty: err?.minQty,
          submitted_qty: err?.submittedQty,
        },
        { status: 400 },
      )
    }

    if (msg === 'SERVICE_QTY_BELOW_COMBO') {
      return NextResponse.json(
        {
          message:
            'Số lượng dịch vụ trên form không được nhỏ hơn số lượng tối thiểu do combo áp dụng',
          service_id: err?.serviceId,
          min_qty: err?.minQty,
          submitted_qty: err?.submittedQty,
        },
        { status: 400 },
      )
    }

    if (msg === 'FAIL_UPDATE_RESERVATION') {
      return NextResponse.json(
        {
          message: 'Không thể cập nhật đặt bàn',
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
          message: 'Không thể cập nhật bàn cho đặt bàn này',
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
          message: 'Không thể tạo đơn hàng',
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
          message: 'Không thể cập nhật chi tiết món ăn trong đơn hàng',
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
          message: 'Không thể cập nhật danh sách dịch vụ đi kèm đặt bàn',
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
        message: isDev ? msg : 'Đã xảy ra lỗi trong quá trình xử lý',
        prismaCode: err?.code,
        detail: isDev ? String(err?.cause?.message ?? '') : undefined,
      },
      { status: statusCode },
    )
  }
}
