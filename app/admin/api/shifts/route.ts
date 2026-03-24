import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaff } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

const OPEN_HOUR = 7
const OPEN_MINUTE = 30
const CLOSE_HOUR = 23
const CLOSE_MINUTE = 30
const MIN_SHIFT_HOURS = 4
const MAX_SHIFT_HOURS = 8

function parseDate(value: unknown) {
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function isWithinAllowedTime(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  const openMinutes = OPEN_HOUR * 60 + OPEN_MINUTE
  const closeMinutes = CLOSE_HOUR * 60 + CLOSE_MINUTE

  return minutes >= openMinutes && minutes <= closeMinutes
}

function getShiftDurationHours(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

export async function GET(req: Request) {
  const access = await requireAdminOrStaff()
  if (!access.ok) return access.res

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
        const from = new Date(`${from_raw}T00:00:00`)
        if (!Number.isNaN(from.getTime())) {
          where.start_time.gte = from
        }
      }

      if (to_raw) {
        const to = new Date(`${to_raw}T23:59:59.999`)
        if (!Number.isNaN(to.getTime())) {
          where.start_time.lte = to
        }
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
      totalPages: Math.max(1, Math.ceil(total / limit)),
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
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
  const access = await requireAdminOrStaff()
  if (!access.ok) return access.res

  try {
    const body = await req.json()

    const start_time = parseDate(body.start_time)
    const end_time = parseDate(body.end_time)

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

    if (start_time.toDateString() !== end_time.toDateString()) {
      return NextResponse.json(
        { message: 'Ca làm phải nằm trong cùng một ngày' },
        { status: 400 },
      )
    }

    if (!isWithinAllowedTime(start_time) || !isWithinAllowedTime(end_time)) {
      return NextResponse.json(
        {
          message: 'Chỉ được chọn thời gian trong khoảng từ 07:30 đến 23:30',
        },
        { status: 400 },
      )
    }

    const durationHours = getShiftDurationHours(start_time, end_time)

    if (durationHours < MIN_SHIFT_HOURS) {
      return NextResponse.json(
        {
          message: `Ca làm tối thiểu ${MIN_SHIFT_HOURS} tiếng`,
        },
        { status: 400 },
      )
    }

    if (durationHours > MAX_SHIFT_HOURS) {
      return NextResponse.json(
        {
          message: `Ca làm tối đa ${MAX_SHIFT_HOURS} tiếng`,
        },
        { status: 400 },
      )
    }

    let resolvedStaffId: number | null = null

    if (access.isAdmin) {
      const staff_id = Number(body.staff_id)

      if (!Number.isFinite(staff_id) || staff_id <= 0) {
        return NextResponse.json(
          { message: 'staff_id không hợp lệ' },
          { status: 400 },
        )
      }

      resolvedStaffId = staff_id
    } else if (access.isStaff) {
      const myStaff = await prisma.staff.findFirst({
        where: {
          user_id: access.userId,
        },
        select: {
          id: true,
          is_active: true,
        },
      })

      if (!myStaff) {
        return NextResponse.json(
          { message: 'Tài khoản staff chưa được liên kết với hồ sơ nhân viên' },
          { status: 404 },
        )
      }

      if (myStaff.is_active === false) {
        return NextResponse.json(
          { message: 'Nhân viên đang bị khóa, không thể tạo ca làm' },
          { status: 409 },
        )
      }

      resolvedStaffId = myStaff.id
    } else {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const staff = await prisma.staff.findUnique({
      where: { id: resolvedStaffId },
      select: {
        id: true,
        is_active: true,
        full_name: true,
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

    const overlapSameStaff = await prisma.shifts.findFirst({
      where: {
        staff_id: resolvedStaffId,
        AND: [
          { start_time: { lt: end_time } },
          { end_time: { gt: start_time } },
        ],
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
      },
    })

    if (overlapSameStaff) {
      return NextResponse.json(
        {
          message: 'Ca làm bị trùng thời gian với ca khác của nhân viên này',
          conflict: overlapSameStaff,
        },
        { status: 409 },
      )
    }

    const overlapOtherStaff = await prisma.shifts.findFirst({
      where: {
        staff_id: { not: resolvedStaffId },
        AND: [
          { start_time: { lt: end_time } },
          { end_time: { gt: start_time } },
        ],
      },
      select: {
        id: true,
        staff_id: true,
        start_time: true,
        end_time: true,
        staff: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    })

    if (overlapOtherStaff) {
      return NextResponse.json(
        {
          message: 'Khung giờ này đã bị trùng với lịch của nhân viên khác',
          conflict: overlapOtherStaff,
        },
        { status: 409 },
      )
    }

    const created = await prisma.shifts.create({
      data: {
        staff_id: resolvedStaffId,
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
