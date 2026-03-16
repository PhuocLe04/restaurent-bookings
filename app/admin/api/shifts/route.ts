import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseDate(value: any) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
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

    const staff_id_raw = searchParams.get('staff_id')
    const from_raw = searchParams.get('from')
    const to_raw = searchParams.get('to')

    const where: any = {}

    if (staff_id_raw) {
      const staff_id = Number(staff_id_raw)
      if (Number.isFinite(staff_id) && staff_id > 0) {
        where.staff_id = staff_id
      }
    }

    if (from_raw || to_raw) {
      where.start_time = {}
      if (from_raw) {
        const from = parseDate(from_raw)
        if (from) where.start_time.gte = from
      }
      if (to_raw) {
        const to = parseDate(to_raw)
        if (to) where.start_time.lte = to
      }
    }

    const [items, total] = await Promise.all([
      prisma.shifts.findMany({
        where,
        include: {
          staff: {
            include: {
              users: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { start_time: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shifts.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error('GET /admin/api/shifts error:', error)
    return NextResponse.json(
      { message: 'Lấy danh sách ca làm thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const staff_id = Number(body.staff_id)
    const start_time = parseDate(body.start_time)
    const end_time = parseDate(body.end_time)

    if (!Number.isFinite(staff_id) || staff_id <= 0) {
      return NextResponse.json(
        { message: 'staff_id không hợp lệ' },
        { status: 400 },
      )
    }

    if (!start_time || !end_time) {
      return NextResponse.json(
        { message: 'start_time hoặc end_time không hợp lệ' },
        { status: 400 },
      )
    }

    if (start_time >= end_time) {
      return NextResponse.json(
        { message: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu' },
        { status: 400 },
      )
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staff_id },
      select: {
        id: true,
        is_active: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
        { status: 404 },
      )
    }

    if (staff.is_active === false) {
      return NextResponse.json(
        { message: 'Nhân viên đang bị khóa, không thể tạo ca làm' },
        { status: 409 },
      )
    }

    // kiểm tra trùng ca:
    // start mới < end cũ AND end mới > start cũ
    const overlap = await prisma.shifts.findFirst({
      where: {
        staff_id,
        AND: [
          { start_time: { lt: end_time } },
          { end_time: { gt: start_time } },
        ],
      },
      select: { id: true, start_time: true, end_time: true },
    })

    if (overlap) {
      return NextResponse.json(
        { message: 'Ca làm bị trùng thời gian với ca khác của nhân viên này' },
        { status: 409 },
      )
    }

    const created = await prisma.shifts.create({
      data: {
        staff_id,
        start_time,
        end_time,
      },
      include: {
        staff: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Tạo ca làm thành công',
        item: created,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /admin/api/shifts error:', error)
    return NextResponse.json(
      { message: 'Tạo ca làm thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}
