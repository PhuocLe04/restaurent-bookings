import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

function parseId(value: string) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ comboId: string; serviceId: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { comboId, serviceId } = await params
    const combo_id = parseId(comboId)
    const service_id = parseId(serviceId)

    if (!combo_id || !service_id) {
      return NextResponse.json(
        { message: 'Khóa không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.combo_services.findUnique({
      where: {
        combo_id_service_id: {
          combo_id,
          service_id,
        },
      },
      include: {
        combo: true,
        services: true,
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy bản ghi' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error(
      'GET /api/admin/combo-services/[comboId]/[serviceId] error:',
      error,
    )
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ comboId: string; serviceId: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { comboId, serviceId } = await params
    const combo_id = parseId(comboId)
    const service_id = parseId(serviceId)

    if (!combo_id || !service_id) {
      return NextResponse.json(
        { message: 'Khóa không hợp lệ' },
        { status: 400 },
      )
    }

    const body = await req.json()

    const exists = await prisma.combo_services.findUnique({
      where: {
        combo_id_service_id: {
          combo_id,
          service_id,
        },
      },
    })

    if (!exists) {
      return NextResponse.json(
        { message: 'Không tìm thấy bản ghi' },
        { status: 404 },
      )
    }

    const updated = await prisma.combo_services.update({
      where: {
        combo_id_service_id: {
          combo_id,
          service_id,
        },
      },
      data: {
        ...(body.quantity !== undefined
          ? { quantity: Number(body.quantity) }
          : {}),
        ...(body.unit_price !== undefined
          ? { unit_price: Number(body.unit_price) }
          : {}),
      },
      include: {
        combo: true,
        services: true,
      },
    })

    return NextResponse.json({ message: 'Cập nhật thành công', item: updated })
  } catch (error) {
    console.error(
      'PUT /api/admin/combo-services/[comboId]/[serviceId] error:',
      error,
    )
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ comboId: string; serviceId: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { comboId, serviceId } = await params
    const combo_id = parseId(comboId)
    const service_id = parseId(serviceId)

    if (!combo_id || !service_id) {
      return NextResponse.json(
        { message: 'Khóa không hợp lệ' },
        { status: 400 },
      )
    }

    await prisma.combo_services.delete({
      where: {
        combo_id_service_id: {
          combo_id,
          service_id,
        },
      },
    })

    return NextResponse.json({ message: 'Xóa bản ghi thành công' })
  } catch (error) {
    console.error(
      'DELETE /api/admin/combo-services/[comboId]/[serviceId] error:',
      error,
    )
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
