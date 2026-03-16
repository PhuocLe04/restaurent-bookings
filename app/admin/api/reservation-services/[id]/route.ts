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
  { params }: { params: Promise<{ reservationId: string; serviceId: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { reservationId, serviceId } = await params
    const reservation_id = parseId(reservationId)
    const service_id = parseId(serviceId)

    if (!reservation_id || !service_id) {
      return NextResponse.json(
        { message: 'Khóa không hợp lệ' },
        { status: 400 },
      )
    }

    const item = await prisma.reservation_services.findUnique({
      where: {
        reservation_id_service_id: {
          reservation_id,
          service_id,
        },
      },
      include: {
        reservations: true,
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
      'GET /api/admin/reservation-services/[reservationId]/[serviceId] error:',
      error,
    )
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ reservationId: string; serviceId: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { reservationId, serviceId } = await params
    const reservation_id = parseId(reservationId)
    const service_id = parseId(serviceId)

    if (!reservation_id || !service_id) {
      return NextResponse.json(
        { message: 'Khóa không hợp lệ' },
        { status: 400 },
      )
    }

    const body = await req.json()

    const exists = await prisma.reservation_services.findUnique({
      where: {
        reservation_id_service_id: {
          reservation_id,
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

    const updated = await prisma.reservation_services.update({
      where: {
        reservation_id_service_id: {
          reservation_id,
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
        reservations: true,
        services: true,
      },
    })

    return NextResponse.json({ message: 'Cập nhật thành công', item: updated })
  } catch (error) {
    console.error(
      'PUT /api/admin/reservation-services/[reservationId]/[serviceId] error:',
      error,
    )
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ reservationId: string; serviceId: string }> },
) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.res

    const { reservationId, serviceId } = await params
    const reservation_id = parseId(reservationId)
    const service_id = parseId(serviceId)

    if (!reservation_id || !service_id) {
      return NextResponse.json(
        { message: 'Khóa không hợp lệ' },
        { status: 400 },
      )
    }

    await prisma.reservation_services.delete({
      where: {
        reservation_id_service_id: {
          reservation_id,
          service_id,
        },
      },
    })

    return NextResponse.json({ message: 'Xóa bản ghi thành công' })
  } catch (error) {
    console.error(
      'DELETE /api/admin/reservation-services/[reservationId]/[serviceId] error:',
      error,
    )
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
