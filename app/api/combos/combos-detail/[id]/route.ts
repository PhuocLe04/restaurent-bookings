import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params
  const id = Number(idParam)

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 })
  }

  const combo = await prisma.combo.findUnique({
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

      combo_services: {
        select: {
          service_id: true,
          quantity: true,
          unit_price: true,
          services: { select: { id: true, name: true, description: true } },
        },
      },
      combo_menu_items: {
        select: {
          menu_item_id: true,
          quantity: true,
          unit_price: true,
          menu_items: {
            select: { id: true, name: true, price: true, image: true },
          },
        },
      },
    },
  })

  if (!combo) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ combo })
}
