// app/api/menu/featured-menu/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseCategoryId(raw: string | null): number | null {
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = parseCategoryId(searchParams.get('categoryId'))

    // ===== helper: fallback ids theo thứ tự (trong category nếu có) =====
    const getFallbackIds = async (excludeIds: number[]) => {
      const fallback = await prisma.menu_items.findMany({
        where: {
          ...(categoryId ? { category_id: categoryId } : {}),
          ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
        },
        select: { id: true },
        // nếu không có created_at thì dùng id
        orderBy: { id: 'desc' },
        take: Math.max(0, 4 - excludeIds.length),
      })
      return fallback.map((x) => x.id)
    }

    // ===== 1) Top theo bán chạy (order CLOSED) =====
    const topAgg = await prisma.order_items.groupBy({
      by: ['menu_item_id'],
      where: {
        orders: { status: 'CLOSED' },
        ...(categoryId ? { menu_items: { category_id: categoryId } } : {}),
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 4,
    })

    const soldMap = new Map<number, number>(
      topAgg.map((x) => [x.menu_item_id, x._sum.quantity ?? 0]),
    )

    let ids = topAgg.map((x) => x.menu_item_id)

    // ✅ 2) Nếu không có top (ALL hoặc category) => fallback 4 sản phẩm theo thứ tự
    if (ids.length === 0) {
      ids = await getFallbackIds([])
    }

    // ===== 3) Nếu có top nhưng chưa đủ 4 => bù thêm theo thứ tự =====
    if (ids.length < 4) {
      const extra = await getFallbackIds(ids)
      ids = [...ids, ...extra]
    }

    if (ids.length === 0) return NextResponse.json({ items: [] })

    // ===== 4) Lấy thông tin menu theo ids =====
    const menus = await prisma.menu_items.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true, // Decimal
        image: true,
        category_id: true,
        categories: { select: { id: true, name: true } },
      },
    })

    const menuMap = new Map(menus.map((m) => [m.id, m]))

    // ===== 5) Giữ đúng thứ tự ids (top trước, fallback sau) =====
    const items = ids
      .map((id) => {
        const m = menuMap.get(id)
        if (!m) return null
        return {
          id: m.id,
          name: m.name,
          price: Number(m.price),
          image: m.image,
          category_id: m.category_id,
          category: { id: m.categories.id, name: m.categories.name },
          total_sold: soldMap.get(id) ?? 0, // fallback sẽ = 0
        }
      })
      .filter(Boolean)

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error(e)
    const msg = e?.message ?? String(e)

    return NextResponse.json(
      {
        message: 'Không thể tải danh sách món nổi bật.',
        error: msg,
      },
      { status: 500 },
    )
  }
}
