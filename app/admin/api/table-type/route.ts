import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    const where: any = q
      ? {
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        }
      : {}

    const [items, total] = await Promise.all([
      prisma.table_types.findMany({
        where,
        include: {
          _count: {
            select: {
              restaurant_tables: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.table_types.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error('GET /admin/api/table-type error:', error)
    return NextResponse.json(
      {
        message: 'Lấy danh sách loại bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
