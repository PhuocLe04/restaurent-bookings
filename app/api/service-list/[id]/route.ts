import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const type = searchParams.get('type')?.trim()
    const idRaw = searchParams.get('id')
    const id = Number(idRaw)

    if (!type || !['service', 'combo'].includes(type)) {
      return NextResponse.json(
        { message: 'type phải là service hoặc combo' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ message: 'id không hợp lệ' }, { status: 400 })
    }

    if (type === 'service') {
      const item = await prisma.services.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          image: true,
          description: true,
          price: true,
          is_active: true,
          created_at: true,
          combo_services: {
            orderBy: {
              combo_id: 'desc',
            },
            select: {
              combo_id: true,
              quantity: true,
              unit_price: true,
              combo: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  total_origin_price: true,
                  sale_price: true,
                  discount_percent: true,
                  is_active: true,
                },
              },
            },
          },
          reservation_services: {
            orderBy: {
              reservation_id: 'desc',
            },
            select: {
              reservation_id: true,
              quantity: true,
              unit_price: true,
            },
          },
          _count: {
            select: {
              combo_services: true,
              reservation_services: true,
            },
          },
        },
      })

      if (!item) {
        return NextResponse.json(
          { message: 'Không tìm thấy dịch vụ' },
          { status: 404 },
        )
      }

      return NextResponse.json({
        type: 'service',
        item,
      })
    }

    const item = await prisma.combo.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        total_origin_price: true,
        sale_price: true,
        discount_percent: true,
        is_active: true,
        created_at: true,
        combo_menu_items: {
          orderBy: {
            menu_item_id: 'desc',
          },
          select: {
            combo_id: true,
            menu_item_id: true,
            quantity: true,
            unit_price: true,
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
                    is_active: true,
                  },
                },
              },
            },
          },
        },
        combo_services: {
          orderBy: {
            service_id: 'desc',
          },
          select: {
            combo_id: true,
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
                is_active: true,
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
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      type: 'combo',
      item,
    })
  } catch (error) {
    console.error('GET /api/catalog/detail error:', error)
    return NextResponse.json(
      { message: 'Lỗi server khi lấy chi tiết dịch vụ hoặc combo' },
      { status: 500 },
    )
  }
}
