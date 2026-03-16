import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const

type ReservationStatus = (typeof ALLOWED_STATUSES)[number]
type Ctx = { params: Promise<{ id: string }> }
type AuditAction = 'LOGIN' | 'LOGOUT' | 'INSERT' | 'UPDATE' | 'DELETE'

function parseId(idRaw: unknown) {
  const id = Number(idRaw)
  return Number.isFinite(id) && id > 0 ? id : null
}

function normalizeStatus(v: unknown): ReservationStatus | null {
  const s = String(v ?? '')
    .trim()
    .toUpperCase()

  return ALLOWED_STATUSES.includes(s as ReservationStatus)
    ? (s as ReservationStatus)
    : null
}

async function getActorUserId(req: Request) {
  const h = req.headers.get('x-user-id')
  const fromHeader = parseId(h)

  const url = new URL(req.url)
  const q = url.searchParams.get('actor_user_id')
  const fromQuery = parseId(q)

  const c = (await cookies()).get('web_user_id')?.value
  const fromCookie = parseId(c)

  return fromHeader ?? fromQuery ?? fromCookie
}

function mapReservationServices(rs: any[]) {
  return rs.map((x) => ({
    service_id: x.service_id,
    name: x.services?.name ?? null,
    price: x.services?.price ?? null,
    is_active: x.services?.is_active ?? null,
    description: x.services?.description ?? null,
    image: x.services?.image ?? null,
    quantity: x.quantity,
    unit_price: x.unit_price,
  }))
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
    r?.checked_in_at ? `checked_in_at=${r.checked_in_at}` : null,
    r?.completed_at ? `completed_at=${r.completed_at}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

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
        reservation_tables: { include: { restaurant_tables: true } },
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
              },
            },
          },
        },
        orders: true,
        payments: true,
      },
    })

    if (!data) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...data,
        reservation_services: mapReservationServices(
          data.reservation_services as any[],
        ),
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
    const { id: idStr } = await ctx.params
    const id = parseId(idStr)

    if (!id) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const actorUserId = await getActorUserId(req)
    if (!actorUserId) {
      return NextResponse.json(
        {
          message:
            'Missing actor user id (x-user-id header or ?actor_user_id= or cookie web_user_id)',
        },
        { status: 400 },
      )
    }

    const body = (await req.json()) as PatchBody

    const exists = await prisma.reservations.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!exists) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const before = await fetchReservationSnapshot(tx, id)
      if (!before) throw new Error('Not found')

      const data: Record<string, any> = {}

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

      if (body.status != null) {
        const nextStatus = normalizeStatus(body.status)
        if (!nextStatus) {
          throw new Error('Invalid status')
        }

        data.status = nextStatus

        if (nextStatus === 'SEATED' && body.checked_in_at === undefined) {
          data.checked_in_at = new Date()
        }

        if (nextStatus === 'COMPLETED' && body.completed_at === undefined) {
          data.completed_at = new Date()
        }
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
        await tx.reservations.update({
          where: { id },
          data,
        })
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
          reservation_tables: { include: { restaurant_tables: true } },
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
                },
              },
            },
          },
          orders: true,
          payments: true,
        },
      })

      if (!afterFull) return null

      return {
        ...afterFull,
        reservation_services: mapReservationServices(
          afterFull.reservation_services as any[],
        ),
      }
    })

    return NextResponse.json({ message: 'Updated', data: updated })
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
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id: idStr } = await ctx.params
    const id = parseId(idStr)

    if (!id) {
      return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
    }

    const actorUserId = await getActorUserId(req)
    if (!actorUserId) {
      return NextResponse.json(
        {
          message:
            'Missing actor user id (x-user-id header or ?actor_user_id= or cookie web_user_id)',
        },
        { status: 400 },
      )
    }

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

    return NextResponse.json({ message: 'Deleted (cascade) and audited' })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Delete reservation failed', error: String(e?.message ?? e) },
      { status: 400 },
    )
  }
}
