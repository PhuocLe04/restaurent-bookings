import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const guests = Number(url.searchParams.get('guests') ?? '0')
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') ?? '6'), 1),
    12,
  )

  if (!guests || guests <= 0) {
    return NextResponse.json({ message: 'guests is required' }, { status: 400 })
  }

  // lấy combo active
  const combos = await prisma.combo.findMany({
    where: { is_active: true },
    select: {
      id: true,
      title: true,
      description: true,
      sale_price: true,
      discount_percent: true,
      total_origin_price: true,
      combo_services: { select: { quantity: true } },
      combo_menu_items: { select: { quantity: true } },
    },
  })

  // scoring nhẹ theo quy mô + giảm giá
  const scored = combos
    .map((c) => {
      const itemsCount = c.combo_menu_items.reduce(
        (s, x) => s + Number(x.quantity ?? 0),
        0,
      )
      const servicesCount = c.combo_services.reduce(
        (s, x) => s + Number(x.quantity ?? 0),
        0,
      )

      // guests lớn thì thích combo “nhiều thứ”
      const sizeScore =
        guests >= 6
          ? itemsCount + servicesCount
          : Math.min(itemsCount + servicesCount, 6)

      const discount = Number(c.discount_percent ?? 0)
      const score = discount * 3 + sizeScore

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        sale_price: c.sale_price,
        total_origin_price: c.total_origin_price,
        discount_percent: c.discount_percent,
        items_count: itemsCount,
        services_count: servicesCount,
        score,
      }
    })
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, limit)

  return NextResponse.json({ guests, combos: scored })
}
