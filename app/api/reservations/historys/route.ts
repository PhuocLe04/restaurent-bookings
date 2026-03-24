import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getUserId(): Promise<number | null> {
  const raw = (await cookies()).get('web_user_id')?.value
  if (!raw) return null

  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function GET(req: Request) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)

    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit') ?? '10') || 10),
    )

    const status = (searchParams.get('status') ?? '').trim()
    const q = (searchParams.get('q') ?? '').trim()

    const where: any = {
      user_id: userId,
    }

    if (status) {
      where.status = status
    }

    if (q) {
      where.OR = [
        {
          reservation_tables: {
            some: {
              restaurant_tables: {
                table_name: { contains: q },
              },
            },
          },
        },
        {
          reservation_tables: {
            some: {
              restaurant_tables: {
                table_types: {
                  name: { contains: q },
                },
              },
            },
          },
        },
      ]
    }

    const [total, rows, successPaymentCount] = await prisma.$transaction([
      prisma.reservations.count({ where }),

      prisma.reservations.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          user_id: true,
          reservation_time: true,
          reservation_endtime: true,
          checked_in_at: true,
          completed_at: true,
          number_of_guests: true,
          status: true,
          created_at: true,

          reservation_tables: {
            select: {
              table_id: true,
              restaurant_tables: {
                select: {
                  id: true,
                  table_name: true,
                  capacity: true,
                  table_type_id: true,
                  table_types: { select: { id: true, name: true } },
                },
              },
            },
          },

          reservation_services: {
            select: {
              service_id: true,
              quantity: true,
              unit_price: true,
              services: {
                select: { id: true, name: true, image: true },
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
              created_at: true,
              paid_at: true,
              order_id: true,
              request_id: true,
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: 3,
          },

          orders: {
            select: {
              id: true,
              status: true,
              grand_total: true,
              deposit_required: true,
              created_at: true,
            },
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
      }),

      prisma.payments.count({
        where: {
          status: 'SUCCESS',
          reservations: {
            user_id: userId,
          },
        },
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages,
      successPaymentCount,
      data: rows,
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
