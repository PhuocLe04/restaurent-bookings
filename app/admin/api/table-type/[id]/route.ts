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
        { message: 'ID loại bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.table_types.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            restaurant_tables: true,
          },
        },
        restaurant_tables: {
          select: {
            id: true,
            table_name: true,
            capacity: true,
            is_active: true,
          },
          orderBy: { id: 'desc' },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy loại bàn' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('GET /admin/api/table-type/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Lấy chi tiết loại bàn thất bại',
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
        { message: 'ID loại bàn không hợp lệ' },
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

    const current = await prisma.table_types.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy loại bàn' },
        { status: 404 },
      )
    }

    const name = normalizeString(body.name)
    const description = normalizeString(body.description)

    if (!name) {
      return NextResponse.json(
        { message: 'Tên loại bàn là bắt buộc' },
        { status: 400 },
      )
    }

    const existed = await prisma.table_types.findFirst({
      where: {
        name: { equals: name },
        NOT: { id },
      },
      select: { id: true },
    })

    if (existed) {
      return NextResponse.json(
        { message: 'Tên loại bàn đã tồn tại' },
        { status: 409 },
      )
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.table_types.update({
        where: { id },
        data: {
          name,
          description: description || null,
        },
        include: {
          _count: {
            select: {
              restaurant_tables: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'table_types',
          entity_id: updated.id,
          action: 'UPDATE',
          description: `Admin #${access.userId} đã cập nhật loại bàn #${updated.id} từ "${current.name}" thành "${updated.name}"`,
          user_id: access.userId,
        },
      })

      return updated
    })

    return NextResponse.json({
      message: 'Cập nhật loại bàn thành công',
      item,
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/table-type/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Cập nhật loại bàn thất bại',
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
        { message: 'ID loại bàn không hợp lệ' },
        { status: 400 },
      )
    }

    const current = await prisma.table_types.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            restaurant_tables: true,
          },
        },
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy loại bàn' },
        { status: 404 },
      )
    }

    if ((current._count?.restaurant_tables ?? 0) > 0) {
      return NextResponse.json(
        {
          message: 'Không thể xóa loại bàn này vì vẫn còn bàn đang liên kết',
        },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.table_types.delete({
        where: { id },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'table_types',
          entity_id: current.id,
          action: 'DELETE',
          description: `Admin #${access.userId} đã xóa loại bàn #${current.id} - ${current.name}`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({
      message: 'Xóa loại bàn thành công',
    })
  } catch (error: any) {
    console.error('DELETE /admin/api/table-type/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Xóa loại bàn thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
