import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

function parseId(id: string) {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const menuItemId = parseId(id)
    if (!menuItemId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.menu_items.findUnique({
      where: { id: menuItemId },
      include: {
        categories: true,
        combo_menu_items: true,
        order_items: true,
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy món ăn' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('GET /api/admin/menu-items/[id] error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const menuItemId = parseId(id)
    if (!menuItemId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json()

    if (body.category_id !== undefined) {
      const categoryId = Number(body.category_id)
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
        return NextResponse.json(
          { message: 'Danh mục không hợp lệ' },
          { status: 400 },
        )
      }

      const category = await prisma.categories.findUnique({
        where: { id: categoryId },
      })
      if (!category) {
        return NextResponse.json(
          { message: 'Danh mục không tồn tại' },
          { status: 404 },
        )
      }
    }

    const exists = await prisma.menu_items.findUnique({
      where: { id: menuItemId },
    })
    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy món ăn' },
        { status: 404 },
      )
    }

    const updated = await prisma.menu_items.update({
      where: { id: menuItemId },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.image !== undefined
          ? { image: body.image ? String(body.image).trim() : null }
          : {}),
        ...(body.category_id !== undefined
          ? { category_id: Number(body.category_id) }
          : {}),
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
        ...(body.is_available !== undefined
          ? { is_available: Boolean(body.is_available) }
          : {}),
      },
      include: {
        categories: true,
      },
    })

    return NextResponse.json({
      message: 'Cập nhật món ăn thành công',
      item: updated,
    })
  } catch (error) {
    console.error('PUT /api/admin/menu-items/[id] error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const menuItemId = parseId(id)
    if (!menuItemId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const exists = await prisma.menu_items.findUnique({
      where: { id: menuItemId },
      include: {
        _count: {
          select: {
            combo_menu_items: true,
            order_items: true,
          },
        },
      },
    })

    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy món ăn' },
        { status: 404 },
      )
    }

    if (exists._count.combo_menu_items > 0 || exists._count.order_items > 0) {
      return NextResponse.json(
        { message: 'Không thể xóa món ăn vì đang được sử dụng ở dữ liệu khác' },
        { status: 400 },
      )
    }

    await prisma.menu_items.delete({
      where: { id: menuItemId },
    })

    return NextResponse.json({ message: 'Xóa món ăn thành công' })
  } catch (error) {
    console.error('DELETE /api/admin/menu-items/[id] error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
