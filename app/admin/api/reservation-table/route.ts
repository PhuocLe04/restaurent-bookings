import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseDate(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') || 10)),
    )
    const skip = (page - 1) * limit

    const q = (searchParams.get('q') || '').trim()
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')
    const status = (searchParams.get('status') || '').trim()

    const from = parseDate(fromRaw)
    const to = parseDate(toRaw)

    const where: any = {
      ...(status ? { reservations: { status } } : {}),
      ...(q
        ? {
            OR: [
              { reservations: { users: { full_name: { contains: q } } } },
              { restaurant_tables: { table_name: { contains: q } } },
              { restaurant_tables: { table_types: { name: { contains: q } } } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            reservations: {
              ...(status ? { status } : {}),
              reservation_time: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.reservation_tables.findMany({
        where,
        include: {
          reservations: {
            select: {
              id: true,
              reservation_time: true,
              reservation_endtime: true,
              number_of_guests: true,
              status: true,
              users: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          restaurant_tables: {
            select: {
              id: true,
              table_name: true,
              capacity: true,
              is_active: true,
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
        orderBy: [{ reservation_id: 'desc' }, { table_id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.reservation_tables.count({ where }),
    ])

    const mapped = items.map((row) => ({
      reservation_id: row.reservation_id,
      table_id: row.table_id,

      user: row.reservations.users
        ? {
            id: row.reservations.users.id,
            full_name: row.reservations.users.full_name,
            email: row.reservations.users.email,
            phone: row.reservations.users.phone,
          }
        : null,

      reservation: {
        time: row.reservations.reservation_time,
        end_time: row.reservations.reservation_endtime,
        number_of_guests: row.reservations.number_of_guests,
        status: row.reservations.status,
      },

      table: {
        id: row.restaurant_tables.id,
        table_name: row.restaurant_tables.table_name,
        capacity: row.restaurant_tables.capacity,
        is_active: row.restaurant_tables.is_active,
        table_type: row.restaurant_tables.table_types,
      },

      display_text: `${row.reservations.users?.full_name || 'Không rõ người đặt'} / ${new Date(
        row.reservations.reservation_time,
      ).toLocaleDateString('vi-VN')} / bàn ${row.restaurant_tables.table_name}`,
    }))

    return NextResponse.json({
      items: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error('GET /admin/api/reservation-table error:', error)
    return NextResponse.json(
      {
        message: 'Lấy danh sách bàn đã đặt thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
