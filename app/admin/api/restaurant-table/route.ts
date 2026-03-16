import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toBool(v: string | null) {
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return undefined
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') || 10)),
    )
    const skip = (page - 1) * limit

    const q = (searchParams.get('q') || '').trim()
    const tableTypeIdRaw = searchParams.get('table_type_id')
    const isActive = toBool(searchParams.get('is_active'))

    const where: any = {
      ...(q
        ? {
            OR: [
              { table_name: { contains: q } },
              { table_types: { name: { contains: q } } },
            ],
          }
        : {}),
      ...(tableTypeIdRaw ? { table_type_id: Number(tableTypeIdRaw) } : {}),
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.restaurant_tables.findMany({
        where,
        include: {
          table_types: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.restaurant_tables.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error('GET /admin/api/restaurant-table error:', error)
    return NextResponse.json(
      {
        message: 'Lấy danh sách bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
