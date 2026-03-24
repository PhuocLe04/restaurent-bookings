import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaff } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

async function parseId(params: Promise<{ id: string }>) {
  const { id } = await params
  const numericId = Number(id)
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null
}

function parseDate(value: any) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(_req: Request, { params }: RouteContext) {
  const access = await requireAdminOrStaff()
  if (!access.ok) return access.res

  try {
    const id = await parseId(params)
    if (!id) {
      return NextResponse.json(
        { message: 'ID ca làm không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.shifts.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy ca làm' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      item,
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
    })
  } catch (error: any) {
    console.error('GET /admin/api/shifts/[id] error:', error)
    return NextResponse.json(
      { message: 'Lấy chi tiết ca làm thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const access = await requireAdminOrStaff()
  if (!access.ok) return access.res

  if (!access.isAdmin) {
    return NextResponse.json(
      { message: 'Chỉ admin mới được cập nhật ca làm' },
      { status: 403 },
    )
  }

  try {
    const id = await parseId(params)
    if (!id) {
      return NextResponse.json(
        { message: 'ID ca làm không hợp lệ' },
        { status: 400 },
      )
    }

    const body = await req.json()

    const existed = await prisma.shifts.findUnique({
      where: { id },
      select: {
        id: true,
        staff_id: true,
        start_time: true,
        end_time: true,
      },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy ca làm' },
        { status: 404 },
      )
    }

    const staff_id =
      body.staff_id !== undefined ? Number(body.staff_id) : existed.staff_id

    const start_time =
      body.start_time !== undefined
        ? parseDate(body.start_time)
        : existed.start_time

    const end_time =
      body.end_time !== undefined ? parseDate(body.end_time) : existed.end_time

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
      select: { id: true, is_active: true },
    })

    if (!staff) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
        { status: 404 },
      )
    }

    if (staff.is_active === false) {
      return NextResponse.json(
        { message: 'Nhân viên đang bị khóa, không thể cập nhật ca làm' },
        { status: 409 },
      )
    }

    const overlap = await prisma.shifts.findFirst({
      where: {
        staff_id,
        NOT: { id },
        AND: [
          { start_time: { lt: end_time } },
          { end_time: { gt: start_time } },
        ],
      },
      select: { id: true },
    })

    if (overlap) {
      return NextResponse.json(
        { message: 'Ca làm bị trùng thời gian với ca khác của nhân viên này' },
        { status: 409 },
      )
    }

    const updated = await prisma.shifts.update({
      where: { id },
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

    return NextResponse.json({
      message: 'Cập nhật ca làm thành công',
      item: updated,
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/shifts/[id] error:', error)
    return NextResponse.json(
      { message: 'Cập nhật ca làm thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const access = await requireAdminOrStaff()
  if (!access.ok) return access.res

  if (!access.isAdmin) {
    return NextResponse.json(
      { message: 'Chỉ admin mới được xóa ca làm' },
      { status: 403 },
    )
  }

  try {
    const id = await parseId(params)
    if (!id) {
      return NextResponse.json(
        { message: 'ID ca làm không hợp lệ' },
        { status: 400 },
      )
    }

    const existed = await prisma.shifts.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy ca làm' },
        { status: 404 },
      )
    }

    await prisma.shifts.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Xóa ca làm thành công',
    })
  } catch (error: any) {
    console.error('DELETE /admin/api/shifts/[id] error:', error)
    return NextResponse.json(
      { message: 'Xóa ca làm thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}
