import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaff } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

const HOLD_MINUTES = 180
const NEAR_DAYS = 2

function toInt(v: string | null, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function getReservationPriority(
  reservationTime: Date,
  now: Date,
  nearEnd: Date,
) {
  const time = reservationTime.getTime()
  const nowTime = now.getTime()
  const nearEndTime = nearEnd.getTime()

  // 0: sắp tới trong 1-2 ngày tới
  if (time >= nowTime && time <= nearEndTime) return 0

  // 1: tương lai xa hơn 2 ngày
  if (time > nearEndTime) return 1

  // 2: đã qua ngày
  return 2
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrStaff()
    if (!auth.ok) return auth.res

    const { searchParams } = new URL(req.url)

    const page = toInt(searchParams.get('page'), 1)
    const limit = toInt(searchParams.get('limit'), 50)

    // optional filters
    const status = searchParams.get('status')?.trim()
    const userId = searchParams.get('user_id')
      ? Number(searchParams.get('user_id'))
      : null

    const where: any = {}
    if (status) where.status = status
    if (userId && Number.isFinite(userId)) where.user_id = userId

    const now = new Date()
    const nearEnd = new Date(now.getTime() + NEAR_DAYS * 24 * 60 * 60 * 1000)

    const allData = await prisma.reservations.findMany({
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
              select: { id: true, name: true, price: true, is_active: true },
            },
          },
        },

        orders: {
          select: {
            id: true,
            status: true,
            grand_total: true,
            deposit_required: true,
            created_at: true,
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
        },
      },
    })

    const sortedData = [...allData].sort((a, b) => {
      const aTime = new Date(a.reservation_time)
      const bTime = new Date(b.reservation_time)

      const aPriority = getReservationPriority(aTime, now, nearEnd)
      const bPriority = getReservationPriority(bTime, now, nearEnd)

      // ưu tiên nhóm trước
      if (aPriority !== bPriority) return aPriority - bPriority

      // nhóm 0 và 1: gần nhất lên trước
      if (aPriority === 0 || aPriority === 1) {
        return aTime.getTime() - bTime.getTime()
      }

      // nhóm 2 (đã qua): cái mới qua gần đây đứng trước, cũ hơn xuống sau
      return bTime.getTime() - aTime.getTime()
    })

    const total = sortedData.length
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit
    const data = sortedData.slice(skip, skip + limit)

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages,
      data,
      access: {
        userId: auth.userId,
        isAdmin: auth.isAdmin,
        isStaff: auth.isStaff,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        message: 'Failed to fetch reservations',
        error: String(e?.message ?? e),
      },
      { status: 500 },
    )
  }
}

type CreateBody = {
  user_id: number
  reservation_time: string
  number_of_guests: number
  status?: string
  table_ids?: number[]
  services?: Array<{
    service_id: number
    quantity?: number
    unit_price?: number
  }>
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrStaff()
    if (!auth.ok) return auth.res

    const body = (await req.json()) as CreateBody

    const user_id = Number(body.user_id)
    const number_of_guests = Number(body.number_of_guests)
    const status = (body.status ?? 'PENDING').trim()

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json({ message: 'Invalid user_id' }, { status: 400 })
    }

    if (!Number.isFinite(number_of_guests) || number_of_guests <= 0) {
      return NextResponse.json(
        { message: 'Invalid number_of_guests' },
        { status: 400 },
      )
    }

    if (!body.reservation_time) {
      return NextResponse.json(
        { message: 'reservation_time is required' },
        { status: 400 },
      )
    }

    const start = new Date(body.reservation_time)
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { message: 'Invalid reservation_time' },
        { status: 400 },
      )
    }

    const end = new Date(start.getTime() + HOLD_MINUTES * 60 * 1000)

    const table_ids = Array.isArray(body.table_ids)
      ? body.table_ids.map(Number).filter((x) => Number.isFinite(x) && x > 0)
      : []

    const services = Array.isArray(body.services) ? body.services : []

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: user_id },
        select: { id: true },
      })
      if (!user) throw new Error('User not found')

      if (table_ids.length) {
        const count = await tx.restaurant_tables.count({
          where: { id: { in: table_ids } },
        })
        if (count !== table_ids.length) {
          throw new Error('Some table_ids are invalid')
        }
      }

      if (services.length) {
        const sIds = services
          .map((s) => Number(s.service_id))
          .filter((x) => Number.isFinite(x) && x > 0)

        const countS = await tx.services.count({
          where: { id: { in: sIds } },
        })

        if (countS !== sIds.length) {
          throw new Error('Some service_id are invalid')
        }
      }

      const reservation = await tx.reservations.create({
        data: {
          user_id,
          reservation_time: start,
          reservation_endtime: end,
          number_of_guests,
          status,
        },
      })

      if (table_ids.length) {
        await tx.reservation_tables.createMany({
          data: table_ids.map((table_id) => ({
            reservation_id: reservation.id,
            table_id,
          })),
        })
      }

      if (services.length) {
        const serviceMap = new Map<number, number>()

        if (services.some((s) => s.unit_price == null)) {
          const rows = await tx.services.findMany({
            where: { id: { in: services.map((s) => Number(s.service_id)) } },
            select: { id: true, price: true },
          })
          rows.forEach((r) => serviceMap.set(r.id, Number(r.price)))
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
              reservation_id: reservation.id,
              service_id: sid,
              quantity,
              unit_price: unitPrice,
            }
          }),
        })
      }

      return tx.reservations.findUnique({
        where: { id: reservation.id },
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
          reservation_services: { include: { services: true } },
          orders: true,
          payments: true,
        },
      })
    })

    return NextResponse.json(
      {
        message: 'Created',
        data: created,
        access: {
          userId: auth.userId,
          isAdmin: auth.isAdmin,
          isStaff: auth.isStaff,
        },
      },
      { status: 201 },
    )
  } catch (e: any) {
    return NextResponse.json(
      {
        message: 'Create reservation failed',
        error: String(e?.message ?? e),
      },
      { status: 400 },
    )
  }
}
