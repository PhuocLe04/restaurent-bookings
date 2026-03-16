import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q')?.trim() || ''
    const categoryIdRaw = searchParams.get('category_id')
    const pageRaw = Number(searchParams.get('page') || 1)
    const limitRaw = Number(searchParams.get('limit') || 10)

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10
    const skip = (page - 1) * limit

    const category_id =
      categoryIdRaw && Number.isFinite(Number(categoryIdRaw))
        ? Number(categoryIdRaw)
        : null

    const where = {
      ...(q
        ? {
            name: {
              contains: q,
            },
          }
        : {}),
      ...(category_id && category_id > 0 ? { category_id } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.menu_items.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        include: {
          categories: true,
        },
      }),
      prisma.menu_items.count({ where }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages,
    })
  } catch (error) {
    console.error('GET /api/admin/menu-items error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const body = await req.json()

    const name = String(body.name || '').trim()
    const category_id = Number(body.category_id)
    const price = Number(body.price)

    if (!name) {
      return NextResponse.json(
        { message: 'Tên món ăn là bắt buộc' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(category_id) || category_id <= 0) {
      return NextResponse.json(
        { message: 'Danh mục không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { message: 'Giá món ăn không hợp lệ' },
        { status: 400 },
      )
    }

    const category = await prisma.categories.findUnique({
      where: { id: category_id },
    })

    if (!category) {
      return NextResponse.json(
        { message: 'Danh mục không tồn tại' },
        { status: 404 },
      )
    }

    const created = await prisma.menu_items.create({
      data: {
        name,
        image: body.image ? String(body.image).trim() : null,
        category_id,
        price,
        is_available: body.is_available ?? true,
      },
      include: {
        categories: true,
      },
    })

    return NextResponse.json(
      { message: 'Tạo món ăn thành công', item: created },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/admin/menu-items error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
