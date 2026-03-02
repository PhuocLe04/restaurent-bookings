import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

function toInt(v: string | null, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function toOptionalInt(v: string | null) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

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

/**
 * GET /admin/api/user?page=1&limit=20&search=...&role=admin|customer&membership_id=1
 * (fallback) q=... cũng chạy
 */
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const url = new URL(req.url)

  const page = toInt(url.searchParams.get('page'), 1)
  const limit = Math.min(toInt(url.searchParams.get('limit'), 20), 50)

  const search = (url.searchParams.get('search') ?? '').trim()
  const q = (url.searchParams.get('q') ?? '').trim()
  const keyword = (search || q).trim()

  const role = (url.searchParams.get('role') ?? '').trim()
  const membership_id = toOptionalInt(url.searchParams.get('membership_id'))

  const where: any = {}
  if (role) where.role = role
  if (membership_id) where.membership_id = membership_id

  if (keyword) {
    where.OR = [
      { full_name: { contains: keyword } },
      { email: { contains: keyword } },
      { phone: { contains: keyword } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        full_name: true,
        avatar: true,
        email: true,
        phone: true,
        role: true,
        member_point: true,
        membership_id: true,
        created_at: true,
        membership: { select: { id: true, name: true, code: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages,
  })
}

/**
 * POST /admin/api/user
 * body: { full_name, email, phone, password, role?, avatar?, membership_id?, member_point? }
 *
 * RULE:
 * - Nếu có membership_id => gán member_point = min_point của membership đó
 * - Else nếu có member_point => suy membership_id theo min_point <= point lớn nhất
 * - Else => default membership_id = 1 (nếu có), và point = min_point của nó
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const body = await req.json().catch(() => null)
  if (!body)
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })

  const full_name = String(body.full_name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const password = String(body.password ?? '').trim()

  const role = String(body.role ?? 'customer').trim()
  const avatar = body.avatar == null ? null : String(body.avatar).trim()

  const rawMembershipId =
    body.membership_id === undefined || body.membership_id === null
      ? undefined
      : Number(body.membership_id)

  const rawMemberPoint =
    body.member_point === undefined || body.member_point === null
      ? undefined
      : Number(body.member_point)

  if (!full_name || !email || !phone || !password) {
    return NextResponse.json(
      { message: 'Missing required fields: full_name, email, phone, password' },
      { status: 400 },
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { message: 'Password must be at least 6 characters' },
      { status: 400 },
    )
  }

  if (!['admin', 'customer'].includes(role)) {
    return NextResponse.json({ message: 'Invalid role' }, { status: 400 })
  }

  if (rawMembershipId !== undefined) {
    if (!Number.isFinite(rawMembershipId) || rawMembershipId <= 0) {
      return NextResponse.json(
        { message: 'Invalid membership_id' },
        { status: 400 },
      )
    }
  }

  if (rawMemberPoint !== undefined) {
    if (!Number.isFinite(rawMemberPoint) || rawMemberPoint < 0) {
      return NextResponse.json(
        { message: 'Invalid member_point' },
        { status: 400 },
      )
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const memberships = await tx.membership.findMany({
        orderBy: { min_point: 'asc' },
        select: { id: true, min_point: true, name: true, code: true },
      })
      if (memberships.length === 0) throw new Error('No membership data found')

      const minMembership = memberships[0]
      const defaultMembership =
        memberships.find((m) => m.id === 1) ?? minMembership

      let finalMembershipId = defaultMembership.id
      let finalPoint = Number(defaultMembership.min_point ?? 0)

      const hasMembershipId = rawMembershipId !== undefined
      const hasMemberPoint = rawMemberPoint !== undefined

      if (hasMembershipId) {
        const mem = memberships.find((m) => m.id === rawMembershipId)
        if (!mem) throw new Error('Membership not found')
        finalMembershipId = mem.id
        finalPoint = Number(mem.min_point ?? 0)
      } else if (hasMemberPoint) {
        finalPoint = rawMemberPoint!

        let chosen = minMembership
        for (const m of memberships) {
          const mp = Number(m.min_point ?? 0)
          if (mp <= finalPoint) chosen = m
          else break
        }
        finalMembershipId = chosen.id
      } else {
        finalMembershipId = defaultMembership.id
        finalPoint = Number(defaultMembership.min_point ?? 0)
      }

      const password_hash = await bcrypt.hash(password, 10)

      return tx.user.create({
        data: {
          full_name,
          email,
          phone,
          password_hash,
          role,
          avatar,
          membership_id: finalMembershipId,
          member_point: finalPoint,
        },
        select: {
          id: true,
          full_name: true,
          avatar: true,
          email: true,
          phone: true,
          role: true,
          member_point: true,
          membership_id: true,
          created_at: true,
          membership: { select: { id: true, name: true, code: true } },
        },
      })
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Create user failed', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
