import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseId(params: { id: string }) {
  const id = Number(params.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

function toDecimalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)

    if (!id) {
      return NextResponse.json({ message: 'id không hợp lệ' }, { status: 400 })
    }

    const data = await prisma.payments.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        reservations: {
          select: {
            id: true,
            reservation_time: true,
            reservation_endtime: true,
            number_of_guests: true,
            status: true,
            orders: {
              select: {
                id: true,
                status: true,
                grand_total: true,
                deposit_required: true,
                created_at: true,
              },
            },
          },
        },
      },
    })

    if (!data) {
      return NextResponse.json(
        { message: 'Không tìm thấy thanh toán' },
        { status: 404 },
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/payments/[id] error:', error)
    return NextResponse.json(
      { message: 'Không thể lấy chi tiết thanh toán' },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)

    if (!id) {
      return NextResponse.json({ message: 'id không hợp lệ' }, { status: 400 })
    }

    const body = await req.json()

    const existed = await prisma.payments.findUnique({
      where: { id },
      select: { id: true, order_id: true },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy thanh toán' },
        { status: 404 },
      )
    }

    const dataToUpdate: any = {}

    if (body.reservation_id !== undefined) {
      const reservation_id = Number(body.reservation_id)
      if (!Number.isFinite(reservation_id) || reservation_id <= 0) {
        return NextResponse.json(
          { message: 'reservation_id không hợp lệ' },
          { status: 400 },
        )
      }

      const reservation = await prisma.reservations.findUnique({
        where: { id: reservation_id },
        select: { id: true },
      })

      if (!reservation) {
        return NextResponse.json(
          { message: 'Không tìm thấy reservation' },
          { status: 404 },
        )
      }

      dataToUpdate.reservation_id = reservation_id
    }

    if (body.user_id !== undefined) {
      const user_id = Number(body.user_id)
      if (!Number.isFinite(user_id) || user_id <= 0) {
        return NextResponse.json(
          { message: 'user_id không hợp lệ' },
          { status: 400 },
        )
      }

      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { id: true },
      })

      if (!user) {
        return NextResponse.json(
          { message: 'Không tìm thấy user' },
          { status: 404 },
        )
      }

      dataToUpdate.user_id = user_id
    }

    if (body.amount !== undefined) {
      const amount = toDecimalNumber(body.amount)
      if (amount === null || amount < 0) {
        return NextResponse.json(
          { message: 'amount không hợp lệ' },
          { status: 400 },
        )
      }
      dataToUpdate.amount = amount
    }

    if (body.payment_method !== undefined) {
      const payment_method = normalizeString(body.payment_method)
      if (!payment_method) {
        return NextResponse.json(
          { message: 'payment_method không được để trống' },
          { status: 400 },
        )
      }
      dataToUpdate.payment_method = payment_method
    }

    if (body.purpose !== undefined) {
      const purpose = normalizeString(body.purpose)
      if (!purpose) {
        return NextResponse.json(
          { message: 'purpose không được để trống' },
          { status: 400 },
        )
      }
      dataToUpdate.purpose = purpose
    }

    if (body.status !== undefined) {
      const status = normalizeString(body.status)
      if (!status) {
        return NextResponse.json(
          { message: 'status không được để trống' },
          { status: 400 },
        )
      }
      dataToUpdate.status = status
    }

    if (body.order_id !== undefined) {
      const order_id = normalizeString(body.order_id)
      if (!order_id) {
        return NextResponse.json(
          { message: 'order_id không được để trống' },
          { status: 400 },
        )
      }

      if (order_id !== existed.order_id) {
        const duplicate = await prisma.payments.findUnique({
          where: { order_id },
          select: { id: true },
        })

        if (duplicate) {
          return NextResponse.json(
            { message: 'order_id đã tồn tại' },
            { status: 409 },
          )
        }
      }

      dataToUpdate.order_id = order_id
    }

    if (body.request_id !== undefined) {
      const request_id = normalizeString(body.request_id)
      if (!request_id) {
        return NextResponse.json(
          { message: 'request_id không được để trống' },
          { status: 400 },
        )
      }
      dataToUpdate.request_id = request_id
    }

    if (body.partner_transaction_id !== undefined) {
      dataToUpdate.partner_transaction_id = body.partner_transaction_id
        ? normalizeString(body.partner_transaction_id)
        : null
    }

    if (body.gateway_response !== undefined) {
      dataToUpdate.gateway_response =
        body.gateway_response === null || body.gateway_response === ''
          ? null
          : typeof body.gateway_response === 'string'
            ? body.gateway_response
            : JSON.stringify(body.gateway_response)
    }

    if (body.paid_at !== undefined) {
      dataToUpdate.paid_at = body.paid_at ? new Date(body.paid_at) : null
    }

    const updated = await prisma.payments.update({
      where: { id },
      data: dataToUpdate,
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        reservations: {
          select: {
            id: true,
            reservation_time: true,
            reservation_endtime: true,
            number_of_guests: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Cập nhật thanh toán thành công',
      data: updated,
    })
  } catch (error: any) {
    console.error('PUT /api/payments/[id] error:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Dữ liệu bị trùng, có thể order_id đã tồn tại' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { message: 'Không thể cập nhật thanh toán' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)

    if (!id) {
      return NextResponse.json({ message: 'id không hợp lệ' }, { status: 400 })
    }

    const existed = await prisma.payments.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existed) {
      return NextResponse.json(
        { message: 'Không tìm thấy thanh toán' },
        { status: 404 },
      )
    }

    await prisma.payments.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Xoá thanh toán thành công',
    })
  } catch (error) {
    console.error('DELETE /api/payments/[id] error:', error)
    return NextResponse.json(
      { message: 'Không thể xoá thanh toán' },
      { status: 500 },
    )
  }
}
