import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toBool(v: string | null, defaultValue?: boolean) {
  if (v == null) return defaultValue
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return defaultValue
}

export async function GET(req: Request) {
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
              { users: { full_name: { contains: q } } },
              { users: { email: { contains: q } } },
              { users: { phone: { contains: q } } },
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
      totalPages: Math.ceil(total / limit),
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
  try {
    const body = await req.json()

    const full_name = String(body.full_name || '').trim()
    const role = String(body.role || '').trim()
    const phone = body.phone ? String(body.phone).trim() : null
    const user_id = Number(body.user_id)
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : true

    if (!full_name) {
      return NextResponse.json(
        { message: 'Vui lòng nhập họ tên nhân viên' },
        { status: 400 },
      )
    }

    if (!role) {
      return NextResponse.json(
        { message: 'Vui lòng nhập vai trò nhân viên' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json(
        { message: 'user_id không hợp lệ' },
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

    const created = await prisma.staff.create({
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
          },
        },
      },
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
