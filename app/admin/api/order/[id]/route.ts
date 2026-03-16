import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    const order = await prisma.orders.findUnique({
      where: { id },
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

    if (!order) {
      return NextResponse.json(
        { message: 'Không tìm thấy order' },
        { status: 404 },
      )
    }

    const menu_items = order.order_items.map((item) => {
      const unit_price = safeDecimal(item.menu_items?.price)
      const quantity = item.quantity || 0

      return {
        id: item.id,
        menu_item_id: item.menu_item_id,
        name: item.menu_items?.name || '',
        image: item.menu_items?.image || null,
        category: item.menu_items?.categories?.name || null,
        quantity,
        unit_price,
        line_total: unit_price * quantity,
        is_available: item.menu_items?.is_available ?? true,
      }
    })

    const service_items =
      order.reservations?.reservation_services?.map((item) => {
        const unit_price =
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
          unit_price,
          line_total: unit_price * quantity,
          is_active: item.services?.is_active ?? true,
          created_at: item.services?.created_at || null,
        }
      }) || []

    const tables =
      order.reservations?.reservation_tables?.map((item) => ({
        table_id: item.table_id,
        table_name: item.restaurant_tables?.table_name || '',
        capacity: item.restaurant_tables?.capacity || 0,
        table_type: item.restaurant_tables?.table_types?.name || null,
        table_type_description:
          item.restaurant_tables?.table_types?.description || null,
      })) || []

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

    const menu_total = menu_items.reduce(
      (sum, item) => sum + item.line_total,
      0,
    )
    const service_total = service_items.reduce(
      (sum, item) => sum + item.line_total,
      0,
    )

    const paid_total = depositSuccessPayments.reduce(
      (sum, item) => sum + item.amount,
      0,
    )

    const pending_total = depositPendingPayments.reduce(
      (sum, item) => sum + item.amount,
      0,
    )

    const order_grand_total = safeDecimal(order.grand_total)
    const remaining_estimated = Math.max(0, order_grand_total - paid_total)

    return NextResponse.json({
      id: order.id,
      reservation_id: order.reservation_id,
      user_id: order.user_id,
      status: order.status,
      grand_total: order_grand_total,
      deposit_required: safeDecimal(order.deposit_required),
      created_at: order.created_at,

      user: {
        id: order.users?.id,
        full_name: order.users?.full_name,
        email: order.users?.email,
        phone: order.users?.phone,
        role: order.users?.role,
        member_point: safeDecimal(order.users?.member_point),
        membership: order.users?.membership || null,
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

      summary: {
        menu_total,
        service_total,
        order_grand_total,
        paid_total,
        pending_total,
        remaining_estimated,
      },
    })
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
    const status = String(body?.status || '')
      .trim()
      .toUpperCase()

    const ALLOWED = ['OPEN', 'CLOSED', 'CANCELLED']
    if (!ALLOWED.includes(status)) {
      return NextResponse.json(
        { message: 'Trạng thái không hợp lệ' },
        { status: 400 },
      )
    }

    const existing = await prisma.orders.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { message: 'Không tìm thấy order' },
        { status: 404 },
      )
    }

    const updated = await prisma.orders.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({
      message: 'Cập nhật trạng thái order thành công',
      data: updated,
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/order/[id] error:', error)
    return NextResponse.json(
      { message: error?.message || 'Không thể cập nhật order' },
      { status: 500 },
    )
  }
}
