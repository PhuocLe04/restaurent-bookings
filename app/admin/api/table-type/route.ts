import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

function toInt(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { searchParams } = new URL(req.url)

    const page = toInt(searchParams.get('page'), 1)
    const limit = Math.min(toInt(searchParams.get('limit'), 10), 100)
    const skip = (page - 1) * limit

    const q = normalizeString(searchParams.get('q'))

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
      totalPages: Math.max(1, Math.ceil(total / limit)),
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

export async function POST(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ' },
        { status: 400 },
      )
    }

    const name = normalizeString(body.name)
    const description = normalizeString(body.description)

    if (!name) {
      return NextResponse.json(
        { message: 'Tên loại bàn là bắt buộc' },
        { status: 400 },
      )
    }

    const existed = await prisma.table_types.findFirst({
      where: {
        name: { equals: name },
      },
      select: { id: true },
    })

    if (existed) {
      return NextResponse.json(
        { message: 'Tên loại bàn đã tồn tại' },
        { status: 409 },
      )
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.table_types.create({
        data: {
          name,
          description: description || null,
        },
        include: {
          _count: {
            select: {
              restaurant_tables: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'table_types',
          entity_id: created.id,
          action: 'INSERT',
          description: `Admin #${access.userId} đã tạo loại bàn #${created.id} - ${created.name}`,
          user_id: access.userId,
        },
      })

      return created
    })

    return NextResponse.json(
      {
        message: 'Tạo loại bàn thành công',
        item,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /admin/api/table-type error:', error)
    return NextResponse.json(
      {
        message: 'Tạo loại bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
