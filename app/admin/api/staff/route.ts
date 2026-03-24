import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

function toBool(v: string | null, defaultValue?: boolean) {
  if (v == null) return defaultValue
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return defaultValue
}

function toPositiveInt(value: unknown) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { searchParams } = new URL(req.url)

    const q = (searchParams.get('q') || '').trim()
    const isActive = toBool(searchParams.get('is_active'))
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') || 10)),
    )
    const skip = (page - 1) * limit

    const where: any = {
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
      ...(q
        ? {
            OR: [
              { full_name: { contains: q } },
              { role: { contains: q } },
              { phone: { contains: q } },
              { users: { is: { full_name: { contains: q } } } },
              { users: { is: { email: { contains: q } } } },
              { users: { is: { phone: { contains: q } } } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
              role: true,
              avatar: true,
              created_at: true,
            },
          },
          shifts: {
            select: {
              id: true,
              start_time: true,
              end_time: true,
            },
            orderBy: { start_time: 'desc' },
            take: 3,
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.staff.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
    })
  } catch (error: any) {
    console.error('GET /admin/api/staff error:', error)
    return NextResponse.json(
      { message: 'Lấy danh sách nhân viên thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const body = await req.json()

    const user_id = toPositiveInt(body.user_id)
    const role = String(body.role || '').trim()
    const inputPhone = body.phone ? String(body.phone).trim() : null
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : true

    if (!user_id) {
      return NextResponse.json(
        { message: 'user_id không hợp lệ' },
        { status: 400 },
      )
    }

    if (!role) {
      return NextResponse.json(
        { message: 'Vui lòng nhập vai trò nhân viên' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        created_at: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy user để gán cho nhân viên' },
        { status: 404 },
      )
    }

    const existedStaff = await prisma.staff.findUnique({
      where: { user_id },
      select: { id: true },
    })

    if (existedStaff) {
      return NextResponse.json(
        { message: 'User này đã được gán cho một nhân viên khác' },
        { status: 409 },
      )
    }

    const full_name = user.full_name?.trim()
    const phone = inputPhone || user.phone || null

    if (!full_name) {
      return NextResponse.json(
        { message: 'User chưa có full_name hợp lệ' },
        { status: 400 },
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const newStaff = await tx.staff.create({
        data: {
          full_name,
          role,
          phone,
          user_id,
          is_active,
        },
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
              role: true,
              avatar: true,
              created_at: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'staff',
          entity_id: newStaff.id,
          action: 'INSERT',
          description: `Admin"${access.userId}"Tạo nhân viên "${newStaff.full_name}" (staff_id=${newStaff.id}, user_id=${newStaff.user_id}, role=${newStaff.role})`,
          user_id: access.userId,
        },
      })

      return newStaff
    })

    return NextResponse.json(
      {
        message: 'Tạo nhân viên thành công',
        item: created,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /admin/api/staff error:', error)
    return NextResponse.json(
      { message: 'Tạo nhân viên thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}
