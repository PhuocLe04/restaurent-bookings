import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseId(params: { id: string }) {
  const id = Number(params.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)
    if (!id) {
      return NextResponse.json(
        { message: 'ID nhân viên không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.staff.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            membership_id: true,
            created_at: true,
          },
        },
        shifts: {
          orderBy: { start_time: 'desc' },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
        { status: 404 },
      )
    }

    return NextResponse.json(item)
  } catch (error: any) {
    console.error('GET /admin/api/staff/[id] error:', error)
    return NextResponse.json(
      { message: 'Lấy chi tiết nhân viên thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)
    if (!id) {
      return NextResponse.json(
        { message: 'ID nhân viên không hợp lệ' },
        { status: 400 },
      )
    }

    const body = await req.json()

    const existed = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, user_id: true },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
        { status: 404 },
      )
    }

    const data: any = {}

    if (body.full_name !== undefined) {
      const full_name = String(body.full_name || '').trim()
      if (!full_name) {
        return NextResponse.json(
          { message: 'Họ tên không được để trống' },
          { status: 400 },
        )
      }
      data.full_name = full_name
    }

    if (body.role !== undefined) {
      const role = String(body.role || '').trim()
      if (!role) {
        return NextResponse.json(
          { message: 'Vai trò không được để trống' },
          { status: 400 },
        )
      }
      data.role = role
    }

    if (body.phone !== undefined) {
      data.phone = body.phone ? String(body.phone).trim() : null
    }

    if (body.is_active !== undefined) {
      data.is_active = !!body.is_active
    }

    if (body.user_id !== undefined) {
      const user_id = Number(body.user_id)
      if (!Number.isFinite(user_id) || user_id <= 0) {
        return NextResponse.json(
          { message: 'user_id không hợp lệ' },
          { status: 400 },
        )
      }

      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { id: true },
      })

      if (!user) {
        return NextResponse.json(
          { message: 'Không tìm thấy user' },
          { status: 404 },
        )
      }

      const duplicate = await prisma.staff.findFirst({
        where: {
          user_id,
          NOT: { id },
        },
        select: { id: true },
      })

      if (duplicate) {
        return NextResponse.json(
          { message: 'User này đã thuộc một nhân viên khác' },
          { status: 409 },
        )
      }

      data.user_id = user_id
    }

    const updated = await prisma.staff.update({
      where: { id },
      data,
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

    return NextResponse.json({
      message: 'Cập nhật nhân viên thành công',
      item: updated,
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/staff/[id] error:', error)
    return NextResponse.json(
      { message: 'Cập nhật nhân viên thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)
    if (!id) {
      return NextResponse.json(
        { message: 'ID nhân viên không hợp lệ' },
        { status: 400 },
      )
    }

    const existed = await prisma.staff.findUnique({
      where: { id },
      include: {
        shifts: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
        { status: 404 },
      )
    }

    if (existed.shifts.length > 0) {
      return NextResponse.json(
        {
          message:
            'Nhân viên đang có ca làm, không thể xóa. Hãy xóa ca làm trước.',
        },
        { status: 409 },
      )
    }

    await prisma.staff.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Xóa nhân viên thành công',
    })
  } catch (error: any) {
    console.error('DELETE /admin/api/staff/[id] error:', error)
    return NextResponse.json(
      { message: 'Xóa nhân viên thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}
