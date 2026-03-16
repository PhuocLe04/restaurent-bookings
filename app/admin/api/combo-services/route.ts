import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = new URL(req.url)
    const comboIdRaw = searchParams.get('combo_id')
    const combo_id = comboIdRaw ? Number(comboIdRaw) : null

    const items = await prisma.combo_services.findMany({
      where: combo_id && Number.isFinite(combo_id) ? { combo_id } : undefined,
      orderBy: [{ combo_id: 'desc' }, { service_id: 'desc' }],
      include: {
        combo: true,
        services: true,
      },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('GET /api/admin/combo-services error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const body = await req.json()
    const combo_id = Number(body.combo_id)
    const service_id = Number(body.service_id)
    const quantity = Number(body.quantity ?? 1)
    const unit_price = Number(body.unit_price)

    if (!Number.isFinite(combo_id) || combo_id <= 0) {
      return NextResponse.json(
        { message: 'combo_id không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(service_id) || service_id <= 0) {
      return NextResponse.json(
        { message: 'service_id không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: 'Số lượng không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(unit_price) || unit_price < 0) {
      return NextResponse.json(
        { message: 'Đơn giá không hợp lệ' },
        { status: 400 },
      )
    }

    const [combo, service, exists] = await Promise.all([
      prisma.combo.findUnique({ where: { id: combo_id } }),
      prisma.services.findUnique({ where: { id: service_id } }),
      prisma.combo_services.findUnique({
        where: {
          combo_id_service_id: {
            combo_id,
            service_id,
          },
        },
      }),
    ])

    if (!combo) {
      return NextResponse.json(
        { message: 'Combo không tồn tại' },
        { status: 404 },
      )
    }

    if (!service) {
      return NextResponse.json(
        { message: 'Dịch vụ không tồn tại' },
        { status: 404 },
      )
    }

    if (exists) {
      return NextResponse.json(
        { message: 'Dịch vụ này đã tồn tại trong combo' },
        { status: 409 },
      )
    }

    const created = await prisma.combo_services.create({
      data: {
        combo_id,
        service_id,
        quantity,
        unit_price,
      },
      include: {
        combo: true,
        services: true,
      },
    })

    return NextResponse.json(
      { message: 'Thêm dịch vụ vào combo thành công', item: created },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/admin/combo-services error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
