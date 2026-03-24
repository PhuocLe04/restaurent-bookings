import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaff } from '@/lib/require-admin'
export const dynamic = 'force-dynamic'

function parseId(idRaw: unknown) {
  const id = Number(idRaw)
  return Number.isFinite(id) && id > 0 ? id : null
}

type Ctx = { params: Promise<{ id: string }> }

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mapReservationTables(rows: any[]) {
  return rows.map((x) => ({
    reservation_id: x.reservation_id,
    table_id: x.table_id,
    table: x.restaurant_tables
      ? {
          id: x.restaurant_tables.id,
          table_name: x.restaurant_tables.table_name,
          capacity: x.restaurant_tables.capacity,
          is_active: x.restaurant_tables.is_active ?? null,
          table_type_id: x.restaurant_tables.table_type_id ?? null,
        }
      : null,
  }))
}

function mapReservationServices(rows: any[]) {
  return rows.map((x) => {
    const quantity = toNumber(x.quantity, 0)
    const unitPrice = toNumber(x.unit_price, 0)

    return {
      reservation_id: x.reservation_id,
      service_id: x.service_id,
      quantity,
      unit_price: unitPrice,
      total_price: quantity * unitPrice,
      service: x.services
        ? {
            id: x.services.id,
            name: x.services.name ?? null,
            price: toNumber(x.services.price, 0),
            is_active: x.services.is_active ?? null,
            description: x.services.description ?? null,
            image: x.services.image ?? null,
            created_at: x.services.created_at ?? null,
          }
        : null,
    }
  })
}

function mapOrders(orders: any[]) {
  return orders.map((o) => ({
    id: o.id,
    reservation_id: o.reservation_id,
    user_id: o.user_id ?? null,
    status: o.status ?? null,
    grand_total: toNumber(o.grand_total, 0),
    deposit_required: toNumber(o.deposit_required, 0),
    created_at: o.created_at ?? null,
    customer: o.users
      ? {
          id: o.users.id,
          full_name: o.users.full_name ?? null,
          email: o.users.email ?? null,
          phone: o.users.phone ?? null,
          role: o.users.role ?? null,
        }
      : null,

    order_items: Array.isArray(o.order_items)
      ? o.order_items.map((item: any) => ({
          id: item.id,
          order_id: item.order_id,
          menu_item_id: item.menu_item_id ?? null,
          quantity: toNumber(item.quantity, 0),
          menu_item: item.menu_items
            ? {
                id: item.menu_items.id,
                name: item.menu_items.name ?? null,
                price: toNumber(item.menu_items.price, 0),
                image: item.menu_items.image ?? null,
                category_id: item.menu_items.category_id ?? null,
                is_available: item.menu_items.is_available ?? null,
              }
            : null,
          total_price:
            toNumber(item.quantity, 0) * toNumber(item.menu_items?.price, 0),
        }))
      : [],
  }))
}

function mapPayments(payments: any[]) {
  return payments.map((p) => ({
    id: p.id,
    reservation_id: p.reservation_id,
    user_id: p.user_id,
    amount: toNumber(p.amount, 0),
    payment_method: p.payment_method ?? null,
    purpose: p.purpose ?? null,
    status: p.status ?? null,
    order_id: p.order_id ?? null,
    request_id: p.request_id ?? null,
    partner_transaction_id: p.partner_transaction_id ?? null,
    gateway_response: p.gateway_response ?? null,
    created_at: p.created_at ?? null,
    paid_at: p.paid_at ?? null,
  }))
}

function buildReservationDetail(data: any) {
  const reservationTables = mapReservationTables(data.reservation_tables ?? [])
  const reservationServices = mapReservationServices(
    data.reservation_services ?? [],
  )
  const orders = mapOrders(data.orders ?? [])
  const payments = mapPayments(data.payments ?? [])

  const serviceTotal = reservationServices.reduce(
    (sum, item) => sum + toNumber(item.total_price, 0),
    0,
  )

  const paidTotal = payments
    .filter((p) => String(p.status ?? '').toUpperCase() === 'PAID')
    .reduce((sum, p) => sum + toNumber(p.amount, 0), 0)

  const latestOrder =
    orders.length > 0
      ? [...orders].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime(),
        )[0]
      : null

  const finalTotal = latestOrder ? toNumber(latestOrder.grand_total, 0) : 0
  const remainingPayment = Math.max(0, finalTotal - paidTotal)

  return {
    id: data.id,
    user_id: data.user_id,
    reservation_time: data.reservation_time,
    reservation_endtime: data.reservation_endtime,
    number_of_guests: data.number_of_guests,
    status: data.status,
    checked_in_at: data.checked_in_at ?? null,
    completed_at: data.completed_at ?? null,
    created_at: data.created_at ?? null,

    customer: data.users
      ? {
          id: data.users.id,
          full_name: data.users.full_name ?? null,
          email: data.users.email ?? null,
          phone: data.users.phone ?? null,
          role: data.users.role ?? null,
        }
      : null,

    reservation_tables: reservationTables,
    reservation_services: reservationServices,
    orders,
    payments,

    summary: {
      table_count: reservationTables.length,
      service_count: reservationServices.length,
      service_total: serviceTotal,
      order_count: orders.length,
      payment_count: payments.length,
      paid_total: paidTotal,
      final_total: finalTotal,
      remaining_payment: remainingPayment,
    },
  }
}

async function fetchReservationSnapshot(tx: any, id: number) {
  return tx.reservations.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, full_name: true } },
      reservation_tables: {
        include: { restaurant_tables: { select: { table_name: true } } },
      },
      reservation_services: {
        include: { services: { select: { name: true } } },
      },
      orders: { select: { id: true } },
    },
  })
}

function buildReservationDesc(prefix: string, r: any) {
  const tableNames = (r?.reservation_tables ?? [])
    .map((x: any) => x.restaurant_tables?.table_name)
    .filter(Boolean)
    .join(', ')

  const serviceNames = (r?.reservation_services ?? [])
    .map((x: any) => x.services?.name)
    .filter(Boolean)
    .join(', ')

  const customer = r?.users?.full_name ?? r?.user_id ?? 'unknown'
  const timeIso =
    r?.reservation_time instanceof Date
      ? r.reservation_time.toISOString()
      : String(r?.reservation_time ?? '')

  return [
    prefix,
    `customer=${customer}`,
    `time=${timeIso}`,
    `guests=${r?.number_of_guests ?? ''}`,
    r?.status ? `status=${r.status}` : null,
    tableNames ? `tables=[${tableNames}]` : null,
    serviceNames ? `services=[${serviceNames}]` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

type AuditAction = 'LOGIN' | 'LOGOUT' | 'INSERT' | 'UPDATE' | 'DELETE'

async function writeAudit(
  tx: any,
  input: {
    user_id: number
    entity: string
    entity_id: number
    action: AuditAction
    description: string
  },
) {
  await tx.audit_logs.create({
    data: {
      entity: input.entity,
      entity_id: input.entity_id,
      action: input.action,
      description: input.description,
      user_id: input.user_id,
    },
  })
}

/* =========================
   GET
========================= */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireAdminOrStaff()
    if (!auth.ok) return auth.res

    const { id: idStr } = await ctx.params
    const id = parseId(idStr)
    if (!id) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const data = await prisma.reservations.findUnique({
      where: { id },
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
              select: {
                id: true,
                table_name: true,
                capacity: true,
                is_active: true,
                table_type_id: true,
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
                price: true,
                is_active: true,
                description: true,
                image: true,
                created_at: true,
              },
            },
          },
        },

        orders: {
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
            order_items: {
              include: {
                menu_items: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    image: true,
                    category_id: true,
                    is_available: true,
                  },
                },
              },
            },
          },
          orderBy: { id: 'desc' },
        },

        payments: {
          orderBy: { id: 'desc' },
        },
      },
    })

    if (!data) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Fetch reservation detail success',
      data: buildReservationDetail(data),
      access: {
        userId: auth.userId,
        isAdmin: auth.isAdmin,
        isStaff: auth.isStaff,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        message: 'Failed to fetch reservation',
        error: String(e?.message ?? e),
      },
      { status: 500 },
    )
  }
}

/* =========================
   PATCH
========================= */
type PatchBody = {
  user_id?: number
  reservation_time?: string
  reservation_endtime?: string
  number_of_guests?: number
  status?: string
  checked_in_at?: string | null
  completed_at?: string | null
  table_ids?: number[]
  services?: Array<{
    service_id: number
    quantity?: number
    unit_price?: number
  }>
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await requireAdminOrStaff()
    if (!auth.ok) return auth.res

    const { id: idStr } = await ctx.params
    const id = parseId(idStr)
    if (!id) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const actorUserId = auth.userId
    const body = (await req.json()) as PatchBody

    const exists = await prisma.reservations.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const before = await fetchReservationSnapshot(tx, id)
      if (!before) throw new Error('Not found')

      const data: any = {}

      if (body.user_id != null) {
        const uid = Number(body.user_id)
        if (!Number.isFinite(uid) || uid <= 0) {
          throw new Error('Invalid user_id')
        }

        const user = await tx.user.findUnique({
          where: { id: uid },
          select: { id: true },
        })
        if (!user) throw new Error('User not found')

        data.user_id = uid
      }

      if (body.number_of_guests != null) {
        const n = Number(body.number_of_guests)
        if (!Number.isFinite(n) || n <= 0) {
          throw new Error('Invalid number_of_guests')
        }
        data.number_of_guests = n
      }

      if (body.status != null) {
        data.status = String(body.status).trim()
      }

      if (body.reservation_time != null) {
        const d = new Date(body.reservation_time)
        if (Number.isNaN(d.getTime())) {
          throw new Error('Invalid reservation_time')
        }
        data.reservation_time = d
      }

      if (body.reservation_endtime != null) {
        const d = new Date(body.reservation_endtime)
        if (Number.isNaN(d.getTime())) {
          throw new Error('Invalid reservation_endtime')
        }
        data.reservation_endtime = d
      }

      if (body.checked_in_at !== undefined) {
        data.checked_in_at = body.checked_in_at
          ? new Date(body.checked_in_at)
          : null
      }

      if (body.completed_at !== undefined) {
        data.completed_at = body.completed_at
          ? new Date(body.completed_at)
          : null
      }

      if (Object.keys(data).length) {
        await tx.reservations.update({ where: { id }, data })
      }

      if (Array.isArray(body.table_ids)) {
        const table_ids = body.table_ids
          .map(Number)
          .filter((x) => Number.isFinite(x) && x > 0)

        if (table_ids.length) {
          const count = await tx.restaurant_tables.count({
            where: { id: { in: table_ids } },
          })
          if (count !== table_ids.length) {
            throw new Error('Some table_ids are invalid')
          }
        }

        await tx.reservation_tables.deleteMany({
          where: { reservation_id: id },
        })

        if (table_ids.length) {
          await tx.reservation_tables.createMany({
            data: table_ids.map((table_id) => ({
              reservation_id: id,
              table_id,
            })),
          })
        }
      }

      if (Array.isArray(body.services)) {
        const services = body.services
        const sIds = services
          .map((s) => Number(s.service_id))
          .filter((x) => Number.isFinite(x) && x > 0)

        if (sIds.length) {
          const countS = await tx.services.count({
            where: { id: { in: sIds } },
          })
          if (countS !== sIds.length) {
            throw new Error('Some service_id are invalid')
          }
        }

        await tx.reservation_services.deleteMany({
          where: { reservation_id: id },
        })

        if (services.length) {
          const needPrice = services.some((s) => s.unit_price == null)
          const serviceMap = new Map<number, number>()

          if (needPrice && sIds.length) {
            const rows = await tx.services.findMany({
              where: { id: { in: sIds } },
              select: { id: true, price: true },
            })
            rows.forEach((r: any) => serviceMap.set(r.id, Number(r.price)))
          }

          await tx.reservation_services.createMany({
            data: services.map((s) => {
              const sid = Number(s.service_id)
              const quantity = Number(s.quantity ?? 1)
              const unitPrice =
                s.unit_price != null
                  ? Number(s.unit_price)
                  : Number(serviceMap.get(sid) ?? 0)

              if (!Number.isFinite(sid) || sid <= 0) {
                throw new Error('Invalid service_id')
              }
              if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error('Invalid quantity')
              }
              if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new Error('Invalid unit_price')
              }

              return {
                reservation_id: id,
                service_id: sid,
                quantity,
                unit_price: unitPrice,
              }
            }),
          })
        }
      }

      const afterSnap = await fetchReservationSnapshot(tx, id)
      if (!afterSnap) throw new Error('Not found after update')

      const desc = [
        buildReservationDesc(`Updated reservation #${id} (before)`, before),
        buildReservationDesc(`Updated reservation #${id} (after)`, afterSnap),
      ].join(' || ')

      await writeAudit(tx, {
        user_id: actorUserId,
        entity: 'reservations',
        entity_id: id,
        action: 'UPDATE',
        description: desc,
      })

      const afterFull = await tx.reservations.findUnique({
        where: { id },
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
                select: {
                  id: true,
                  table_name: true,
                  capacity: true,
                  is_active: true,
                  table_type_id: true,
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
                  price: true,
                  is_active: true,
                  description: true,
                  image: true,
                  created_at: true,
                },
              },
            },
          },
          orders: {
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
              order_items: {
                include: {
                  menu_items: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      image: true,
                      category_id: true,
                      is_available: true,
                    },
                  },
                },
              },
            },
            orderBy: { id: 'desc' },
          },
          payments: {
            orderBy: { id: 'desc' },
          },
        },
      })

      if (!afterFull) return afterFull

      return buildReservationDetail(afterFull)
    })

    return NextResponse.json({
      message: 'Updated',
      data: updated,
      access: {
        userId: auth.userId,
        isAdmin: auth.isAdmin,
        isStaff: auth.isStaff,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Update reservation failed', error: String(e?.message ?? e) },
      { status: 400 },
    )
  }
}

/* =========================
   DELETE
========================= */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireAdminOrStaff()
    if (!auth.ok) return auth.res

    if (!auth.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id: idStr } = await ctx.params
    const id = parseId(idStr)
    if (!id) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const actorUserId = auth.userId

    const reservation = await prisma.reservations.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, full_name: true } },
        reservation_tables: {
          include: { restaurant_tables: { select: { table_name: true } } },
        },
        reservation_services: {
          include: { services: { select: { name: true } } },
        },
        orders: { select: { id: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const orderIds = reservation.orders.map((o) => o.id)

      if (orderIds.length) {
        await tx.order_items.deleteMany({
          where: { order_id: { in: orderIds } },
        })
      }

      await tx.payments.deleteMany({ where: { reservation_id: id } })
      await tx.orders.deleteMany({ where: { reservation_id: id } })
      await tx.reservation_services.deleteMany({
        where: { reservation_id: id },
      })
      await tx.reservation_tables.deleteMany({ where: { reservation_id: id } })
      await tx.reservations.delete({ where: { id } })

      await writeAudit(tx, {
        user_id: actorUserId,
        entity: 'reservations',
        entity_id: id,
        action: 'DELETE',
        description: buildReservationDesc(
          `Deleted reservation #${id}`,
          reservation,
        ),
      })
    })

    return NextResponse.json({
      message: 'Deleted (cascade) and audited',
      access: {
        userId: auth.userId,
        isAdmin: auth.isAdmin,
        isStaff: auth.isStaff,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Delete reservation failed', error: String(e?.message ?? e) },
      { status: 400 },
    )
  }
}
