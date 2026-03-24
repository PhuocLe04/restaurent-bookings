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

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true') return true
    if (v === 'false') return false
  }

  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }

  return fallback
}

// ================= GET LIST =================
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
          name: { contains: q },
        }
      : {}

    const [items, total] = await Promise.all([
      prisma.categories.findMany({
        where,
        include: {
          _count: {
            select: { menu_items: true },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.categories.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lấy danh mục thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

// ================= CREATE =================
export async function POST(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu không hợp lệ' },
        { status: 400 },
      )
    }

    const name = normalizeString(body.name)
    const is_active = normalizeBoolean(body.is_active, true)

    if (!name) {
      return NextResponse.json(
        { message: 'Tên danh mục là bắt buộc' },
        { status: 400 },
      )
    }

    const existed = await prisma.categories.findFirst({
      where: { name },
    })

    if (existed) {
      return NextResponse.json(
        { message: 'Tên danh mục đã tồn tại' },
        { status: 409 },
      )
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.categories.create({
        data: {
          name,
          is_active,
        },
        include: {
          _count: { select: { menu_items: true } },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'categories',
          entity_id: created.id,
          action: 'INSERT',
          description: `Admin #${access.userId} tạo danh mục #${created.id} - ${created.name} | active: ${created.is_active}`,
          user_id: access.userId,
        },
      })

      return created
    })

    return NextResponse.json(
      { message: 'Tạo thành công', item },
      { status: 201 },
    )
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Tạo thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}
