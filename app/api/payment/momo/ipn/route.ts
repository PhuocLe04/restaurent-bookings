import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

async function readBody(req: Request) {
  const ct = req.headers.get('content-type') || ''
  if (
    ct.includes('application/x-www-form-urlencoded') ||
    ct.includes('multipart/form-data')
  ) {
    const fd = await req.formData()
    return Object.fromEntries(fd.entries()) as Record<string, any>
  }
  return (await req.json()) as Record<string, any>
}

function mustEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v.trim()
}

function hmacSHA256(raw: string, secretKey: string) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(raw, 'utf8')
    .digest('hex')
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req)

    const secretKey = mustEnv('MOMO_SECRET_KEY')
    const accessKey = mustEnv('MOMO_ACCESS_KEY')

    const receivedSignature = body?.signature
    if (!receivedSignature) {
      return NextResponse.json(
        { message: 'Missing signature' },
        { status: 400 },
      )
    }

    // ====== IPN SIGNATURE (alphabet order) ======
    // accessKey, amount, extraData, message, orderId, orderInfo, orderType,
    // partnerCode, payType, requestId, responseTime, resultCode, transId
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${String(body.amount ?? '')}` +
      `&extraData=${body.extraData ?? ''}` +
      `&message=${body.message ?? ''}` +
      `&orderId=${body.orderId ?? ''}` +
      `&orderInfo=${body.orderInfo ?? ''}` +
      `&orderType=${body.orderType ?? ''}` +
      `&partnerCode=${body.partnerCode ?? ''}` +
      `&payType=${body.payType ?? ''}` +
      `&requestId=${body.requestId ?? ''}` +
      `&responseTime=${String(body.responseTime ?? '')}` +
      `&resultCode=${String(body.resultCode ?? '')}` +
      `&transId=${String(body.transId ?? '')}`

    const expectedSignature = hmacSHA256(rawSignature, secretKey)

    if (String(receivedSignature) !== expectedSignature) {
      return NextResponse.json(
        {
          message: 'Invalid signature',
          debug: { rawSignature, receivedSignature, expectedSignature },
        },
        { status: 400 },
      )
    }

    const momoOrderId = String(body.orderId ?? '')
    if (!momoOrderId) {
      return NextResponse.json({ message: 'Missing orderId' }, { status: 400 })
    }

    const payment = await prisma.payments.findUnique({
      where: { order_id: momoOrderId },
    })
    if (!payment) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 },
      )
    }

    // chống xử lý lại
    if (payment.status === 'SUCCESS') {
      return NextResponse.json(
        { message: 'Already processed' },
        { status: 200 },
      )
    }

    const ok = Number(body.resultCode) === 0
    const gatewayResponse = JSON.stringify(body)

    if (ok) {
      // ORDER_{orderDbId}_{now}
      const orderDbId = Number(momoOrderId.split('_')[1])

      await prisma.$transaction([
        prisma.payments.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            paid_at: new Date(),
            partner_transaction_id: String(body.transId ?? ''),
            gateway_response: gatewayResponse,
          },
        }),
        prisma.orders.update({
          where: { id: orderDbId },
          data: { status: 'DEPOSIT_PAID' },
        }),
      ])
    } else {
      await prisma.payments.update({
        where: { id: payment.id },
        data: { status: 'FAILED', gateway_response: gatewayResponse },
      })
    }

    // MoMo thường yêu cầu response 200 OK
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  } catch (e: any) {
    console.error('MOMO IPN ERROR:', e)
    return NextResponse.json(
      { message: 'IPN error', detail: String(e?.message ?? e) },
      { status: 500 },
    )
  }
}
