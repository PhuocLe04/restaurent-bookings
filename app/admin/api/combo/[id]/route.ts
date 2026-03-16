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
    const comboId = parseId(id)
    if (!comboId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        combo_menu_items: {
          include: { menu_items: true },
        },
        combo_services: {
          include: { services: true },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('GET /api/admin/combo/[id] error:', error)
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
    const comboId = parseId(id)
    if (!comboId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await req.json()
    const title = String(body.title || '').trim()

    if (!title) {
      return NextResponse.json(
        { message: 'Tên combo là bắt buộc' },
        { status: 400 },
      )
    }

    const exists = await prisma.combo.findUnique({ where: { id: comboId } })
    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    const updated = await prisma.combo.update({
      where: { id: comboId },
      data: {
        title,
        ...(body.description !== undefined
          ? {
              description: body.description
                ? String(body.description).trim()
                : null,
            }
          : {}),
        ...(body.sale_price !== undefined
          ? { sale_price: Number(body.sale_price) }
          : {}),
        ...(body.total_origin_price !== undefined
          ? { total_origin_price: Number(body.total_origin_price) }
          : {}),
        ...(body.discount_percent !== undefined
          ? {
              discount_percent:
                body.discount_percent === null || body.discount_percent === ''
                  ? null
                  : Number(body.discount_percent),
            }
          : {}),
        ...(body.is_active !== undefined
          ? { is_active: Boolean(body.is_active) }
          : {}),
      },
    })

    return NextResponse.json({
      message: 'Cập nhật combo thành công',
      item: updated,
    })
  } catch (error) {
    console.error('PUT /api/admin/combo/[id] error:', error)
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
    const comboId = parseId(id)
    if (!comboId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const exists = await prisma.combo.findUnique({ where: { id: comboId } })
    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy combo' },
        { status: 404 },
      )
    }

    await prisma.combo.delete({
      where: { id: comboId },
    })

    return NextResponse.json({ message: 'Xóa combo thành công' })
  } catch (error) {
    console.error('DELETE /api/admin/combo/[id] error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
