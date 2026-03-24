import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true') return true
    if (v === 'false') return false
  }

  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }

  return fallback
}

function getIdFromUrl(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean)
  const rawId = parts[parts.length - 1]
  const id = Number(rawId)
  return Number.isFinite(id) && id > 0 ? id : null
}

// ================= GET DETAIL =================
export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.categories.findUnique({
      where: { id },
      include: {
        _count: { select: { menu_items: true } },
        menu_items: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            is_available: true,
          },
          take: 20,
          orderBy: { id: 'desc' },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi GET', detail: error?.message },
      { status: 500 },
    )
  }
}

// ================= UPDATE =================
export async function PATCH(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)
    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ message: 'Body lỗi' }, { status: 400 })
    }

    const name = normalizeString(body.name)
    const is_active = normalizeBoolean(body.is_active, true)

    if (!name) {
      return NextResponse.json({ message: 'Tên bắt buộc' }, { status: 400 })
    }

    const current = await prisma.categories.findUnique({
      where: { id },
    })

    if (!current) {
      return NextResponse.json({ message: 'Không tồn tại' }, { status: 404 })
    }

    const existed = await prisma.categories.findFirst({
      where: {
        name,
        NOT: { id },
      },
    })

    if (existed) {
      return NextResponse.json({ message: 'Tên đã tồn tại' }, { status: 409 })
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.categories.update({
        where: { id },
        data: {
          name,
          is_active,
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'categories',
          entity_id: id,
          action: 'UPDATE',
          description: `Admin #${access.userId} sửa category #${id} | name: "${current.name}" -> "${updated.name}" | active: ${current.is_active} -> ${updated.is_active}`,
          user_id: access.userId,
        },
      })

      return updated
    })

    return NextResponse.json({
      message: 'Update thành công',
      item,
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Update lỗi', detail: error?.message },
      { status: 500 },
    )
  }
}

// ================= DELETE =================
export async function DELETE(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!id) {
      return NextResponse.json({ message: 'ID sai' }, { status: 400 })
    }

    const current = await prisma.categories.findUnique({
      where: { id },
      include: {
        _count: { select: { menu_items: true } },
      },
    })

    if (!current) {
      return NextResponse.json({ message: 'Không tồn tại' }, { status: 404 })
    }

    if (current._count.menu_items > 0) {
      return NextResponse.json(
        { message: 'Danh mục còn món, không xóa được' },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.categories.delete({ where: { id } })

      await tx.audit_logs.create({
        data: {
          entity: 'categories',
          entity_id: id,
          action: 'DELETE',
          description: `Admin #${access.userId} xóa ${current.name}`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({ message: 'Xóa thành công' })
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Xóa lỗi', detail: error?.message },
      { status: 500 },
    )
  }
}
