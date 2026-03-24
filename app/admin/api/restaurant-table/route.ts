import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

function toBool(v: string | null) {
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return undefined
}

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
      totalPages: Math.max(1, Math.ceil(total / limit)),
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

    const table_name = normalizeString(body.table_name)
    const capacity = Number(body.capacity)
    const table_type_id = Number(body.table_type_id)
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : true

    if (!table_name) {
      return NextResponse.json(
        { message: 'Tên bàn là bắt buộc' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      return NextResponse.json(
        { message: 'Sức chứa phải là số lớn hơn 0' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(table_type_id) || table_type_id <= 0) {
      return NextResponse.json(
        { message: 'Loại bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const typeExists = await prisma.table_types.findUnique({
      where: { id: table_type_id },
      select: { id: true, name: true },
    })

    if (!typeExists) {
      return NextResponse.json(
        { message: 'Không tìm thấy loại bàn' },
        { status: 404 },
      )
    }

    const existed = await prisma.restaurant_tables.findFirst({
      where: {
        table_name: { equals: table_name },
      },
      select: { id: true },
    })

    if (existed) {
      return NextResponse.json(
        { message: 'Tên bàn đã tồn tại' },
        { status: 409 },
      )
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.restaurant_tables.create({
        data: {
          table_name,
          capacity,
          table_type_id,
          is_active,
        },
        include: {
          table_types: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'restaurant_tables',
          entity_id: created.id,
          action: 'INSERT',
          description: `Admin #${access.userId} đã tạo bàn #${created.id} - ${created.table_name} (type #${created.table_type_id})`,
          user_id: access.userId,
        },
      })

      return created
    })

    return NextResponse.json(
      {
        message: 'Tạo bàn thành công',
        item,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /admin/api/restaurant-table error:', error)
    return NextResponse.json(
      {
        message: 'Tạo bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
