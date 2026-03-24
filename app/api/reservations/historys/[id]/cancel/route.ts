import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getUserId(): Promise<number | null> {
  const raw = (await cookies()).get('web_user_id')?.value
  if (!raw) return null

  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserId()

    if (!userId) {
      return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }

    const { id } = await params
    const reservationId = Number(id)

    if (!Number.isFinite(reservationId) || reservationId <= 0) {
      return NextResponse.json(
        { message: 'Invalid reservation id' },
        { status: 400 },
      )
    }

    const reservation = await prisma.reservations.findFirst({
      where: {
        id: reservationId,
        user_id: userId,
      },
      select: {
        id: true,
        status: true,
        orders: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const currentStatus = String(reservation.status || '').toUpperCase()
    const allowCancelStatuses = ['PENDING', 'CONFIRMED']

    if (!allowCancelStatuses.includes(currentStatus)) {
      return NextResponse.json(
        {
          message:
            'Chỉ được hủy các reservation có trạng thái PENDING hoặc CONFIRMED',
        },
        { status: 400 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.reservations.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELLED',
        },
      })

      await tx.orders.updateMany({
        where: {
          reservation_id: reservationId,
        },
        data: {
          status: 'CLOSED',
        },
      })
    })

    return NextResponse.json({
      message: 'Hủy bàn thành công',
      reservation_id: reservationId,
      reservation_status: 'CANCELLED',
      order_status: 'CLOSED',
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
