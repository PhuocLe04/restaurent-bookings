import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''

    const items = await prisma.combo.findMany({
      where: q
        ? {
            title: {
              contains: q,
            },
          }
        : undefined,
      orderBy: { id: 'desc' },
      include: {
        combo_menu_items: true,
        combo_services: true,
      },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('GET /api/admin/combo error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const body = await req.json()
    const title = String(body.title || '').trim()
    const sale_price = Number(body.sale_price)
    const total_origin_price = Number(body.total_origin_price ?? 0)
    const discount_percent =
      body.discount_percent === null ||
      body.discount_percent === undefined ||
      body.discount_percent === ''
        ? null
        : Number(body.discount_percent)

    if (!title) {
      return NextResponse.json(
        { message: 'Tên combo là bắt buộc' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(sale_price) || sale_price < 0) {
      return NextResponse.json(
        { message: 'Giá bán không hợp lệ' },
        { status: 400 },
      )
    }

    const created = await prisma.combo.create({
      data: {
        title,
        description: body.description ? String(body.description).trim() : null,
        sale_price,
        total_origin_price: Number.isFinite(total_origin_price)
          ? total_origin_price
          : 0,
        discount_percent,
        is_active: body.is_active ?? true,
      },
    })

    return NextResponse.json(
      { message: 'Tạo combo thành công', item: created },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/admin/combo error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
