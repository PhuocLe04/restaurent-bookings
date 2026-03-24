import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function getIdFromUrl(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean)
  const rawId = parts[parts.length - 1]
  const id = Number(rawId)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!id) {
      return NextResponse.json(
        { message: 'ID bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.restaurant_tables.findUnique({
      where: { id },
      include: {
        table_types: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        reservation_tables: {
          select: {
            reservation_id: true,
          },
          take: 10,
          orderBy: {
            reservation_id: 'desc',
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy bàn' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('GET /admin/api/restaurant-table/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Lấy chi tiết bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!id) {
      return NextResponse.json(
        { message: 'ID bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ' },
        { status: 400 },
      )
    }

    const current = await prisma.restaurant_tables.findUnique({
      where: { id },
      select: {
        id: true,
        table_name: true,
        capacity: true,
        table_type_id: true,
        is_active: true,
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy bàn' },
        { status: 404 },
      )
    }

    const table_name = normalizeString(body.table_name)
    const capacity = Number(body.capacity)
    const table_type_id = Number(body.table_type_id)
    const is_active =
      typeof body.is_active === 'boolean' ? body.is_active : undefined

    if (!table_name) {
      return NextResponse.json(
        { message: 'Tên bàn là bắt buộc' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      return NextResponse.json(
        { message: 'Sức chứa phải là số lớn hơn 0' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(table_type_id) || table_type_id <= 0) {
      return NextResponse.json(
        { message: 'Loại bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const typeExists = await prisma.table_types.findUnique({
      where: { id: table_type_id },
      select: { id: true, name: true },
    })

    if (!typeExists) {
      return NextResponse.json(
        { message: 'Không tìm thấy loại bàn' },
        { status: 404 },
      )
    }

    const existed = await prisma.restaurant_tables.findFirst({
      where: {
        table_name: { equals: table_name },
        NOT: { id },
      },
      select: { id: true },
    })

    if (existed) {
      return NextResponse.json(
        { message: 'Tên bàn đã tồn tại' },
        { status: 409 },
      )
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.restaurant_tables.update({
        where: { id },
        data: {
          table_name,
          capacity,
          table_type_id,
          ...(typeof is_active === 'boolean' ? { is_active } : {}),
        },
        include: {
          table_types: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'restaurant_tables',
          entity_id: updated.id,
          action: 'UPDATE',
          description: `Admin #${access.userId} đã cập nhật bàn #${updated.id} từ "${current.table_name}" thành "${updated.table_name}"`,
          user_id: access.userId,
        },
      })

      return updated
    })

    return NextResponse.json({
      message: 'Cập nhật bàn thành công',
      item,
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/restaurant-table/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Cập nhật bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!id) {
      return NextResponse.json(
        { message: 'ID bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const current = await prisma.restaurant_tables.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservation_tables: true,
          },
        },
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy bàn' },
        { status: 404 },
      )
    }

    if ((current._count?.reservation_tables ?? 0) > 0) {
      return NextResponse.json(
        {
          message: 'Không thể xóa bàn này vì đang có dữ liệu đặt bàn liên kết',
        },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.restaurant_tables.delete({
        where: { id },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'restaurant_tables',
          entity_id: current.id,
          action: 'DELETE',
          description: `Admin #${access.userId} đã xóa bàn #${current.id} - ${current.table_name}`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({
      message: 'Xóa bàn thành công',
    })
  } catch (error: any) {
    console.error('DELETE /admin/api/restaurant-table/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Xóa bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
