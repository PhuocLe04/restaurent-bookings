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
    const categoryId = parseId(id)
    if (!categoryId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: {
        menu_items: true,
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy danh mục' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('GET /api/admin/categories/[id] error:', error)
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
    const categoryId = parseId(id)
    if (!categoryId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json()
    const name = String(body.name || '').trim()

    if (!name) {
      return NextResponse.json(
        { message: 'Tên danh mục là bắt buộc' },
        { status: 400 },
      )
    }

    const exists = await prisma.categories.findUnique({
      where: { id: categoryId },
    })
    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy danh mục' },
        { status: 404 },
      )
    }

    const updated = await prisma.categories.update({
      where: { id: categoryId },
      data: {
        name,
        ...(body.is_active !== undefined
          ? { is_active: Boolean(body.is_active) }
          : {}),
      },
    })

    return NextResponse.json({ message: 'Cập nhật thành công', item: updated })
  } catch (error) {
    console.error('PUT /api/admin/categories/[id] error:', error)
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
    const categoryId = parseId(id)
    if (!categoryId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const exists = await prisma.categories.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { menu_items: true } } },
    })

    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy danh mục' },
        { status: 404 },
      )
    }

    if (exists._count.menu_items > 0) {
      return NextResponse.json(
        {
          message:
            'Không thể xóa danh mục vì đang có món ăn thuộc danh mục này',
        },
        { status: 400 },
      )
    }

    await prisma.categories.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ message: 'Xóa danh mục thành công' })
  } catch (error) {
    console.error('DELETE /api/admin/categories/[id] error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
