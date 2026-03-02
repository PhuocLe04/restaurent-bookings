import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const cookieStore = await cookies()
  const userIdStr = cookieStore.get('web_user_id')?.value ?? null
  const userId = userIdStr ? Number(userIdStr) : NaN

  if (!Number.isFinite(userId) || userId <= 0) {
    return {
      ok: false as const,
      res: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    }
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  })

  if (!me) {
    return {
      ok: false as const,
      res: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (me.role !== 'admin') {
    return {
      ok: false as const,
      res: NextResponse.json({ message: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true as const, me }
}

// GET /admin/api/membership?page=&limit=&search=
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20),
  )
  const search = (url.searchParams.get('search') ?? '').trim()

  const where = search
    ? {
        OR: [{ name: { contains: search } }, { code: { contains: search } }],
      }
    : {}

  const [total, itemsRaw] = await Promise.all([
    prisma.membership.count({ where }),
    prisma.membership.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        min_point: true,
        discount_percent: true,
        created_at: true,
        _count: { select: { users: true } },
      },
    }),
  ])

  const items = itemsRaw.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    min_point: m.min_point,
    discount_percent: m.discount_percent,
    created_at: m.created_at,
    usersCount: m._count.users,
  }))

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  })
}

// POST /admin/api/membership
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ message: 'Body không hợp lệ' }, { status: 400 })
  }

  const code = String(body.code ?? '').trim()
  const name = String(body.name ?? '').trim()
  const min_point = Number(body.min_point ?? 0)
  const discount_percent = Number(body.discount_percent ?? 0)

  if (!code)
    return NextResponse.json({ message: 'Code là bắt buộc' }, { status: 400 })
  if (!name)
    return NextResponse.json(
      { message: 'Tên hạng là bắt buộc' },
      { status: 400 },
    )
  if (!Number.isFinite(min_point) || min_point < 0) {
    return NextResponse.json(
      { message: 'min_point không hợp lệ' },
      { status: 400 },
    )
  }
  if (
    !Number.isFinite(discount_percent) ||
    discount_percent < 0 ||
    discount_percent > 100
  ) {
    return NextResponse.json(
      { message: 'discount_percent phải từ 0–100' },
      { status: 400 },
    )
  }

  // unique code
  const existed = await prisma.membership.findUnique({ where: { code } })
  if (existed) {
    return NextResponse.json({ message: 'Code đã tồn tại' }, { status: 409 })
  }

  const created = await prisma.membership.create({
    data: {
      code,
      name,
      min_point,
      discount_percent: Math.floor(discount_percent),
    },
    select: {
      id: true,
      code: true,
      name: true,
      min_point: true,
      discount_percent: true,
      created_at: true,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
