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

export async function GET(
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
    if (!reservationId) {
      return NextResponse.json(
        { message: 'Invalid reservation id' },
        { status: 400 },
      )
    }

    // ✅ chỉ cho xem reservation của chính user
    const reservation = await prisma.reservations.findFirst({
      where: { id: reservationId, user_id: userId },
      select: {
        id: true,
        user_id: true,
        reservation_time: true,
        reservation_endtime: true,
        checked_in_at: true,
        completed_at: true,
        number_of_guests: true,
        status: true,
        created_at: true,

        users: {
          select: { id: true, full_name: true, email: true, phone: true },
        },

        reservation_tables: {
          select: {
            table_id: true,
            restaurant_tables: {
              select: {
                id: true,
                table_name: true,
                capacity: true,
                is_active: true,
                table_types: {
                  select: { id: true, name: true, description: true },
                },
              },
            },
          },
        },

        reservation_services: {
          select: {
            service_id: true,
            quantity: true,
            unit_price: true,
            services: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
              },
            },
          },
        },

        orders: {
          select: {
            id: true,
            status: true,
            grand_total: true,
            deposit_required: true,
            created_at: true,
            order_items: {
              select: {
                id: true,
                menu_item_id: true,
                quantity: true,
                menu_items: {
                  select: { id: true, name: true, price: true, image: true },
                },
              },
            },
          },
        },

        payments: {
          select: {
            id: true,
            amount: true,
            payment_method: true,
            purpose: true,
            status: true,
            order_id: true,
            request_id: true,
            partner_transaction_id: true,
            gateway_response: true,
            created_at: true,
            paid_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(reservation)
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
