import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json(
        { message: 'Missing orderId query param' },
        { status: 400 },
      )
    }

    const items = await prisma.order_items.findMany({
      where: {
        order_id: Number(orderId),
      },
      include: {
        menu_items: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
          },
        },
      },
    })

    const safe = items.map((x) => ({
      id: x.id,
      order_id: x.order_id,
      quantity: x.quantity,
      menu: {
        id: x.menu_items.id,
        name: x.menu_items.name,
        price: Number(x.menu_items.price),
        image: x.menu_items.image,
      },
      total: Number(x.menu_items.price) * x.quantity,
    }))

    return NextResponse.json({ items: safe })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: 'Failed to load order items' },
      { status: 500 },
    )
  }
}
