import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaff } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

function toNumber(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
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

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getReservationSortBucket(
  reservationTime: Date | string | null | undefined,
  now: Date,
) {
  if (!reservationTime) return 4

  const time = new Date(reservationTime)
  const todayStart = startOfDay(now)
  const next2DaysEnd = endOfDay(addDays(now, 2))

  // Ưu tiên: từ hôm nay đến hết 2 ngày tới
  if (time >= todayStart && time <= next2DaysEnd) return 0

  // Tương lai xa hơn
  if (time > next2DaysEnd) return 1

  // Đã qua
  if (time < todayStart) return 2

  return 3
}

function compareOrdersByReservationPriority(a: any, b: any) {
  const now = new Date()

  const aTimeRaw = a.reservations?.reservation_time ?? null
  const bTimeRaw = b.reservations?.reservation_time ?? null

  const aBucket = getReservationSortBucket(aTimeRaw, now)
  const bBucket = getReservationSortBucket(bTimeRaw, now)

  if (aBucket !== bBucket) return aBucket - bBucket

  const aTime = aTimeRaw ? new Date(aTimeRaw).getTime() : 0
  const bTime = bTimeRaw ? new Date(bTimeRaw).getTime() : 0

  // Nhóm gần hiện tại / tương lai: gần hơn lên trước
  if (aBucket === 0 || aBucket === 1) {
    if (aTime !== bTime) return aTime - bTime
    return b.id - a.id
  }

  // Nhóm đã qua: mới qua gần đây lên trước, cũ hơn xuống sau
  if (aBucket === 2) {
    if (aTime !== bTime) return bTime - aTime
    return b.id - a.id
  }

  return b.id - a.id
}

function isPaymentSuccess(status: unknown) {
  const s = normalizeText(status)
  return s === 'SUCCESS' || s === 'PAID'
}

export async function GET(req: NextRequest) {
  try {
    const access = await requireAdminOrStaff()
    if (!access.ok) return access.res

    const { searchParams } = new URL(req.url)

    const page = toNumber(searchParams.get('page'), 1)
    const limit = toNumber(searchParams.get('limit'), 10)
    const keyword = (searchParams.get('keyword') || '').trim()
    const status = (searchParams.get('status') || '').trim()
    const reservationIdRaw = searchParams.get('reservation_id')
    const userIdRaw = searchParams.get('user_id')

    const reservationId = reservationIdRaw ? Number(reservationIdRaw) : null
    const userId = userIdRaw ? Number(userIdRaw) : null

    const where: any = {
      ...(status ? { status } : {}),
      ...(Number.isFinite(reservationId) && reservationId! > 0
        ? { reservation_id: reservationId }
        : {}),
      ...(Number.isFinite(userId) && userId! > 0 ? { user_id: userId } : {}),
      ...(keyword
        ? {
            OR: [
              { users: { full_name: { contains: keyword } } },
              { users: { email: { contains: keyword } } },
              { id: Number.isFinite(Number(keyword)) ? Number(keyword) : -1 },
            ],
          }
        : {}),
    }

    const items = await prisma.orders.findMany({
      where,
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
        reservations: {
          select: {
            id: true,
            reservation_time: true,
            reservation_endtime: true,
            number_of_guests: true,
            status: true,
            reservation_tables: {
              include: {
                restaurant_tables: {
                  select: {
                    id: true,
                    table_name: true,
                    capacity: true,
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
                created_at: true,
                paid_at: true,
              },
              orderBy: { id: 'desc' },
            },
          },
        },
        order_items: {
          include: {
            menu_items: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
                is_available: true,
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
      },
    })

    const sortedItems = [...items].sort(compareOrdersByReservationPriority)

    const total = sortedItems.length
    const pagedItems = sortedItems.slice((page - 1) * limit, page * limit)

    const data = pagedItems.map((order) => {
      const menuItems = order.order_items.map((item) => {
        const unitPrice = safeDecimal(item.menu_items?.price)
        const quantity = item.quantity || 0

        return {
          id: item.id,
          menu_item_id: item.menu_item_id,
          name: item.menu_items?.name || '',
          image: item.menu_items?.image || null,
          category: item.menu_items?.categories?.name || null,
          quantity,
          unit_price: unitPrice,
          line_total: unitPrice * quantity,
          is_available: item.menu_items?.is_available ?? true,
        }
      })

      const serviceItems =
        order.reservations?.reservation_services?.map((item) => {
          const unitPrice =
            item.unit_price != null
              ? safeDecimal(item.unit_price)
              : safeDecimal(item.services?.price)
          const quantity = item.quantity || 0

          return {
            service_id: item.service_id,
            name: item.services?.name || '',
            image: item.services?.image || null,
            description: item.services?.description || null,
            quantity,
            unit_price: unitPrice,
            line_total: unitPrice * quantity,
          }
        }) || []

      const tableNames =
        order.reservations?.reservation_tables?.map(
          (t) => t.restaurant_tables?.table_name || `Bàn #${t.table_id}`,
        ) || []

      const payments = order.reservations?.payments || []

      const depositSuccessPayments = payments.filter(
        (p) =>
          isPaymentSuccess(p.status) && normalizeText(p.purpose) === 'DEPOSIT',
      )

      const finalSuccessPayments = payments.filter(
        (p) =>
          isPaymentSuccess(p.status) && normalizeText(p.purpose) === 'FINAL',
      )

      const depositPendingPayments = payments.filter(
        (p) =>
          normalizeText(p.status) === 'PENDING' &&
          normalizeText(p.purpose) === 'DEPOSIT',
      )

      const menuTotal = menuItems.reduce(
        (sum, item) => sum + item.line_total,
        0,
      )
      const serviceTotal = serviceItems.reduce(
        (sum, item) => sum + item.line_total,
        0,
      )

      const paidTotal = depositSuccessPayments.reduce(
        (sum, p) => sum + safeDecimal(p.amount),
        0,
      )

      const finalPaidTotal = finalSuccessPayments.reduce(
        (sum, p) => sum + safeDecimal(p.amount),
        0,
      )

      const pendingTotal = depositPendingPayments.reduce(
        (sum, p) => sum + safeDecimal(p.amount),
        0,
      )

      const orderTotal = safeDecimal(order.grand_total)
      const hasFinalPaid = finalSuccessPayments.length > 0

      const remainingEstimated = hasFinalPaid
        ? 0
        : Math.max(0, orderTotal - paidTotal)

      return {
        id: order.id,
        reservation_id: order.reservation_id,
        user_id: order.user_id,
        status: order.status,
        grand_total: orderTotal,
        deposit_required: safeDecimal(order.deposit_required),
        created_at: order.created_at,
        user: order.users,
        reservation: {
          id: order.reservations?.id,
          reservation_time: order.reservations?.reservation_time,
          reservation_endtime: order.reservations?.reservation_endtime,
          number_of_guests: order.reservations?.number_of_guests,
          status: order.reservations?.status,
          tables: tableNames,
        },
        items_summary: {
          menu_count: menuItems.length,
          service_count: serviceItems.length,
          menu_total: menuTotal,
          service_total: serviceTotal,
          paid_total: paidTotal,
          final_paid_total: finalPaidTotal,
          pending_total: pendingTotal,
          remaining_estimated: remainingEstimated,
          has_final_paid: hasFinalPaid,
        },
        menu_items: menuItems,
        service_items: serviceItems,
        payments,
      }
    })

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    })
  } catch (error: any) {
    console.error('GET /admin/api/orders error:', error)
    return NextResponse.json(
      { message: error?.message || 'Không thể tải danh sách order' },
      { status: 500 },
    )
  }
}
