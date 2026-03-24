import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toInt(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q')?.trim() || ''

    const servicePage = toInt(searchParams.get('service_page'), 1)
    const serviceLimit = Math.min(
      toInt(searchParams.get('service_limit'), 10),
      100,
    )
    const serviceSkip = (servicePage - 1) * serviceLimit

    const comboPage = toInt(searchParams.get('combo_page'), 1)
    const comboLimit = Math.min(toInt(searchParams.get('combo_limit'), 10), 100)
    const comboSkip = (comboPage - 1) * comboLimit

    const serviceWhere = {
      is_active: true,
      ...(q
        ? {
            OR: [
              {
                name: {
                  contains: q,
                },
              },
              {
                description: {
                  contains: q,
                },
              },
            ],
          }
        : {}),
    }

    const comboWhere = {
      is_active: true,
      ...(q
        ? {
            OR: [
              {
                title: {
                  contains: q,
                },
              },
              {
                description: {
                  contains: q,
                },
              },
            ],
          }
        : {}),
    }

    const [services, servicesTotal, combos, combosTotal] = await Promise.all([
      prisma.services.findMany({
        where: serviceWhere,
        orderBy: { id: 'desc' },
        skip: serviceSkip,
        take: serviceLimit,
        select: {
          id: true,
          name: true,
          image: true,
          description: true,
          price: true,
          _count: {
            select: {
              combo_services: true,
              reservation_services: true,
            },
          },
        },
      }),

      prisma.services.count({
        where: serviceWhere,
      }),

      prisma.combo.findMany({
        where: comboWhere,
        orderBy: { id: 'desc' },
        skip: comboSkip,
        take: comboLimit,
        select: {
          id: true,
          title: true,
          description: true,
          total_origin_price: true,
          sale_price: true,
          discount_percent: true,
          combo_services: {
            orderBy: {
              service_id: 'asc',
            },
            select: {
              service_id: true,
              quantity: true,
              unit_price: true,
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
          _count: {
            select: {
              combo_menu_items: true,
              combo_services: true,
            },
          },
        },
      }),

      prisma.combo.count({
        where: comboWhere,
      }),
    ])

    return NextResponse.json({
      services: {
        items: services,
        pagination: {
          page: servicePage,
          limit: serviceLimit,
          total: servicesTotal,
          totalPages: Math.max(1, Math.ceil(servicesTotal / serviceLimit)),
        },
      },
      combos: {
        items: combos,
        pagination: {
          page: comboPage,
          limit: comboLimit,
          total: combosTotal,
          totalPages: Math.max(1, Math.ceil(combosTotal / comboLimit)),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/service-list error:', error)
    return NextResponse.json(
      { message: 'Lỗi server khi lấy danh sách dịch vụ và combo' },
      { status: 500 },
    )
  }
}
