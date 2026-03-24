import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Body = {
  method?: string

  // momo
  orderId?: string
  requestId?: string
  amount?: string
  orderInfo?: string
  transId?: string
  resultCode?: string
  message?: string

  // cash
  order_id?: string
  payment_order_id?: string
  request_id?: string
  status?: string

  // common
  purpose?: string
}

function normalizeMethod(method?: string) {
  const m = String(method || '')
    .trim()
    .toLowerCase()

  if (m === 'momo') return 'MOMO'
  if (m === 'cash') return 'CASH'
  return ''
}

function isAlreadyPaid(status?: string | null) {
  const s = String(status || '')
    .trim()
    .toUpperCase()
  return s === 'SUCCESS' || s === 'PAID'
}

function isSuccessByMethod(method: 'MOMO' | 'CASH', body: Body) {
  if (method === 'MOMO') {
    return String(body.resultCode || '').trim() === '0'
  }

  return (
    String(body.status || '')
      .trim()
      .toLowerCase() === 'success'
  )
}

function parseRealOrderIdFromPaymentOrderId(paymentOrderId?: string | null) {
  const raw = String(paymentOrderId || '')
  const match = raw.match(/(?:FINAL_ORDER|ORDER|FINAL_CASH|CASH)_(\d+)_/i)
  if (!match) return null

  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null
    const payload = body || {}

    const method = normalizeMethod(payload.method)
    if (!method) {
      return NextResponse.json(
        { ok: false, reason: 'INVALID_METHOD' },
        { status: 400 },
      )
    }

    const momoOrderId = String(payload.orderId || '').trim()
    const momoRequestId = String(payload.requestId || '').trim()

    const cashOrderId = String(payload.order_id || '').trim()
    const cashPaymentOrderId = String(payload.payment_order_id || '').trim()
    const cashRequestId = String(payload.request_id || '').trim()

    const lookupOrderId =
      method === 'MOMO' ? momoOrderId : cashPaymentOrderId || cashOrderId
    const lookupRequestId = method === 'MOMO' ? momoRequestId : cashRequestId

    if (!lookupOrderId && !lookupRequestId) {
      return NextResponse.json(
        { ok: false, reason: 'MISSING_IDS' },
        { status: 400 },
      )
    }

    let payment = null as {
      id: number
      order_id: string | null
      request_id: string | null
      reservation_id: number
      status: string | null
      purpose: string | null
    } | null

    if (lookupRequestId) {
      payment = await prisma.payments.findFirst({
        where: { request_id: lookupRequestId },
        select: {
          id: true,
          order_id: true,
          request_id: true,
          reservation_id: true,
          status: true,
          purpose: true,
        },
      })
    }

    if (!payment && lookupOrderId) {
      payment = await prisma.payments.findFirst({
        where: { order_id: lookupOrderId },
        select: {
          id: true,
          order_id: true,
          request_id: true,
          reservation_id: true,
          status: true,
          purpose: true,
        },
      })
    }

    console.log('RETURN SYNC INPUT:', {
      method,
      lookupOrderId,
      lookupRequestId,
      payload,
    })
    console.log('RETURN SYNC FOUND PAYMENT:', payment)

    if (!payment) {
      return NextResponse.json({ ok: false, reason: 'NOT_FOUND' })
    }

    const purpose = String(payload.purpose || payment.purpose || 'FINAL')
      .trim()
      .toUpperCase()

    const success = isSuccessByMethod(method, payload)

    const gatewayResponse =
      method === 'MOMO'
        ? {
            method,
            orderId: momoOrderId,
            requestId: momoRequestId,
            amount: String(payload.amount || '').trim(),
            orderInfo: String(payload.orderInfo || '').trim(),
            transId: String(payload.transId || '').trim(),
            resultCode: String(payload.resultCode || '').trim(),
            message: String(payload.message || '').trim(),
            purpose,
            synced_at: new Date().toISOString(),
          }
        : {
            method,
            order_id: cashOrderId,
            payment_order_id: cashPaymentOrderId,
            request_id: cashRequestId,
            amount: String(payload.amount || '').trim(),
            status: String(payload.status || '').trim(),
            purpose,
            synced_at: new Date().toISOString(),
          }

    // thanh toán thất bại
    if (!success) {
      const updated = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payments.update({
          where: { id: payment!.id },
          data: {
            status: 'FAILED',
            paid_at: null,
            gateway_response: JSON.stringify({
              ...gatewayResponse,
              note:
                method === 'MOMO'
                  ? 'Return marked as FAILED because resultCode !== 0'
                  : 'Return marked as FAILED because status !== success',
            }),
          },
          select: {
            id: true,
            status: true,
          },
        })

        await tx.reservations.update({
          where: { id: payment!.reservation_id },
          data: { status: 'PENDING' },
        })

        return updatedPayment
      })

      return NextResponse.json({
        ok: true,
        reason: 'FAILED_UPDATED',
        payment_id: updated.id,
        status: updated.status,
      })
    }

    if (isAlreadyPaid(payment.status)) {
      return NextResponse.json({
        ok: true,
        reason: 'ALREADY_SUCCESS',
      })
    }

    const realOrderId =
      parseRealOrderIdFromPaymentOrderId(payment.order_id) ||
      parseRealOrderIdFromPaymentOrderId(momoOrderId) ||
      parseRealOrderIdFromPaymentOrderId(cashPaymentOrderId) ||
      parseRealOrderIdFromPaymentOrderId(cashOrderId)

    await prisma.$transaction(async (tx) => {
      await tx.payments.update({
        where: { id: payment!.id },
        data: {
          status: 'SUCCESS',
          paid_at: new Date(),
          gateway_response: JSON.stringify({
            ...gatewayResponse,
            note: 'Return marked as SUCCESS',
          }),
        },
      })

      // thành công thì reservation => COMPLETED
      await tx.reservations.update({
        where: { id: payment!.reservation_id },
        data: { status: 'COMPLETED' },
      })

      // order => CLOSED nếu chưa CLOSED
      if (realOrderId) {
        await tx.orders.updateMany({
          where: {
            id: realOrderId,
            NOT: {
              status: 'CLOSED',
            },
          },
          data: {
            status: 'CLOSED',
          },
        })
      }
    })

    return NextResponse.json({
      ok: true,
      reason: 'SUCCESS_UPDATED',
    })
  } catch (error: any) {
    console.error('RETURN SYNC ERROR:', error)

    return NextResponse.json(
      {
        ok: false,
        reason: 'SERVER_ERROR',
        detail: String(error?.message || error),
      },
      { status: 500 },
    )
  }
}
