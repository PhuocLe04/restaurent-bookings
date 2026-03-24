import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }> | { id: string }
}

async function getRouteId(context: RouteContext) {
  const resolvedParams = await context.params
  const id = Number(resolvedParams?.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

const staffDetailInclude = {
  users: {
    include: {
      membership: true,
    },
  },
  shifts: {
    orderBy: { start_time: 'desc' as const },
  },
}

export async function GET(_req: Request, context: RouteContext) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = await getRouteId(context)

    if (!id) {
      return NextResponse.json(
        { message: 'ID nhân viên không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.staff.findUnique({
      where: { id },
      include: staffDetailInclude,
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
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
    console.error('GET /admin/api/staff/[id] error:', error)
    return NextResponse.json(
      { message: 'Lấy chi tiết nhân viên thất bại', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = await getRouteId(context)

    if (!id) {
      return NextResponse.json(
        { message: 'ID nhân viên không hợp lệ' },
        { status: 400 },
      )
    }

    const body = await req.json()

    const existed = await prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        role: true,
        phone: true,
        is_active: true,
      },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy nhân viên' },
        { status: 404 },
      )
    }

    const data: {
      full_name?: string
      role?: string
      phone?: string | null
      is_active?: boolean
      user_id?: number
    } = {}

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
        include: {
          membership: true,
        },
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

      if (body.full_name === undefined && user.full_name?.trim()) {
        data.full_name = user.full_name.trim()
      }

      if (body.phone === undefined) {
        data.phone = user.phone ? String(user.phone).trim() : null
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.staff.update({
        where: { id },
        data,
        include: {
          users: {
            include: {
              membership: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'staff',
          entity_id: item.id,
          action: 'UPDATE',
          description:
            `Cập nhật nhân viên "${item.full_name}" ` +
            `(staff_id=${item.id}, user_id=${item.user_id}, role=${item.role}, is_active=${item.is_active})`,
          user_id: access.userId,
        },
      })

      return item
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

export async function DELETE(_req: Request, context: RouteContext) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = await getRouteId(context)

    if (!id) {
      return NextResponse.json(
        { message: 'ID nhân viên không hợp lệ' },
        { status: 400 },
      )
    }

    const existed = await prisma.staff.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            membership: true,
          },
        },
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

    await prisma.$transaction(async (tx) => {
      await tx.staff.delete({
        where: { id },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'staff',
          entity_id: existed.id,
          action: 'DELETE',
          description:
            `Xóa nhân viên "${existed.full_name}" ` +
            `(staff_id=${existed.id}, user_id=${existed.user_id}, role=${existed.role}` +
            `${existed.users ? `, user_name=${existed.users.full_name}` : ''})`,
          user_id: access.userId,
        },
      })
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
