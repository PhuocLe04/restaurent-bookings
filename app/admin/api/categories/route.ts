import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.res
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''

    const pageRaw = Number(searchParams.get('page') || 1)
    const limitRaw = Number(searchParams.get('limit') || 10)

    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10
    const skip = (page - 1) * limit

    const where = q
      ? {
          name: {
            contains: q,
          },
        }
      : undefined

    const [items, total] = await Promise.all([
      prisma.categories.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { menu_items: true },
          },
        },
      }),
      prisma.categories.count({ where }),
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
    console.error('GET /api/admin/categories error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return auth.res
    }

    const body = await req.json()
    const name = String(body.name || '').trim()
    const is_active = body.is_active ?? true

    if (!name) {
      return NextResponse.json(
        { message: 'Tên danh mục là bắt buộc' },
        { status: 400 },
      )
    }

    const created = await prisma.categories.create({
      data: {
        name,
        is_active: Boolean(is_active),
      },
    })

    return NextResponse.json(
      { message: 'Tạo danh mục thành công', item: created },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/admin/categories error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
