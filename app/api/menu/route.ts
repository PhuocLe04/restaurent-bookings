import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type MenuItemDTO = {
  id: number
  name: string
  price: number
  image: string | null
  category_id: number
  category: {
    id: number
    name: string
  }
}

export async function GET() {
  try {
    const [categories, items] = await Promise.all([
      prisma.categories.findMany({
        where: { is_active: true },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      }),
      prisma.menu_items.findMany({
        where: { is_available: true },
        select: {
          id: true,
          name: true,
          price: true, // Decimal
          image: true, // String?
          category_id: true,
          categories: { select: { id: true, name: true } },
        },
        orderBy: { id: 'asc' },
      }),
    ])

    const safeItems: MenuItemDTO[] = items.map((x) => ({
      id: x.id,
      name: x.name,
      price: Number(x.price), // convert Decimal -> number
      image: x.image,
      category_id: x.category_id,
      category: {
        id: x.categories.id,
        name: x.categories.name,
      },
    }))

    return NextResponse.json({ categories, items: safeItems })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: 'Failed to load menu' },
      { status: 500 },
    )
  }
}
