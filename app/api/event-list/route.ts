import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const activeRaw = searchParams.get('active')
    const onlyActive = activeRaw === null ? true : activeRaw !== 'false'

    const combos = await prisma.combo.findMany({
      where: onlyActive ? { is_active: true } : undefined,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        total_origin_price: true, // Decimal
        sale_price: true, // Decimal
        discount_percent: true,
        is_active: true,
        created_at: true,

        combo_services: {
          select: {
            quantity: true,
            unit_price: true, // Decimal (nếu bạn lưu)
            services: {
              select: {
                id: true,
                name: true,
                image: true,
                description: true, // ✅ lấy description service
                price: true, // Decimal (giá gốc service nếu cần)
              },
            },
          },
        },

        combo_menu_items: {
          select: {
            quantity: true,
            unit_price: true, // Decimal (nếu bạn lưu)
            menu_items: {
              select: {
                id: true,
                name: true, // ✅ lấy tên món ăn
              },
            },
          },
        },
      },
    })

    const items = combos.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      total_origin_price: Number(c.total_origin_price),
      sale_price: Number(c.sale_price),
      discount_percent: c.discount_percent,
      is_active: c.is_active,
      created_at: c.created_at,

      services: c.combo_services.map((cs) => ({
        id: cs.services.id,
        name: cs.services.name,
        image: cs.services.image,
        description: cs.services.description, // ✅
        quantity: cs.quantity,
        unit_price: cs.unit_price ? Number(cs.unit_price) : null,
        base_price: Number(cs.services.price),
      })),

      menu_items: c.combo_menu_items.map((cm) => ({
        id: cm.menu_items.id,
        name: cm.menu_items.name, // ✅
        quantity: cm.quantity,
        unit_price: cm.unit_price ? Number(cm.unit_price) : null,
      })),
    }))

    return NextResponse.json({ combos: items })
  } catch (e) {
    console.error('[GET /api/combos]', e)
    return NextResponse.json(
      { message: 'Failed to load combos' },
      { status: 500 },
    )
  }
}
