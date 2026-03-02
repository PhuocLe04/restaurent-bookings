import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

type CreateBody = { order_id?: number | string }

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
    const body = (await req.json().catch(() => null)) as CreateBody | null
    const orderId = Number(body?.order_id)

    if (!orderId) {
      return NextResponse.json({ message: 'Missing order_id' }, { status: 400 })
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        reservation_id: true,
        user_id: true,
        deposit_required: true,
        grand_total: true,
      },
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const amount = Math.round(
      Number(order.deposit_required ?? 0) ||
        Number(order.grand_total ?? 0) ||
        0,
    )

    if (amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid payment amount' },
        { status: 400 },
      )
    }

    // ====== ENV (trim để tránh dính newline) ======
    const partnerCode = mustEnv('MOMO_PARTNER_CODE')
    const accessKey = mustEnv('MOMO_ACCESS_KEY')
    const secretKey = mustEnv('MOMO_SECRET_KEY')
    const endpoint = mustEnv('MOMO_ENDPOINT') // https://test-payment.momo.vn/v2/gateway/api/create
    const redirectUrl = mustEnv('MOMO_RETURN_URL') // https://.../payment/momo/return
    const ipnUrl = mustEnv('MOMO_IPN_URL') // nên là public url (ngrok / domain)

    // ====== CREATE PARAMS ======
    const now = Date.now()
    const requestId = `${order.id}-${now}`
    const momoOrderId = `ORDER_${order.id}_${now}`

    const orderInfo = `Deposit payment for order #${order.id}`
    const extraData = '' // nếu bạn muốn encode base64 json thì để ở đây
    const requestType = 'captureWallet'

    // ====== SIGNATURE (CREATE - theo spec create, KHÔNG alphabet) ======
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${String(amount)}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${momoOrderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`

    const signature = hmacSHA256(rawSignature, secretKey)

    // ====== create payment row first (PENDING) ======
    await prisma.payments.create({
      data: {
        reservation_id: order.reservation_id,
        user_id: order.user_id,
        amount,
        payment_method: 'MOMO',
        purpose: 'DEPOSIT',
        status: 'PENDING',
        order_id: momoOrderId,
        request_id: requestId,
      },
    })

    // ====== CALL MOMO ======
    const momoRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId: momoOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        signature,
        lang: 'vi',
      }),
    })

    const momoText = await momoRes.text()
    let momoData: any
    try {
      momoData = JSON.parse(momoText)
    } catch {
      await prisma.payments.update({
        where: { order_id: momoOrderId },
        data: { status: 'FAILED', gateway_response: momoText },
      })
      return NextResponse.json(
        { message: 'MoMo returned non-JSON', momoStatus: momoRes.status },
        { status: 502 },
      )
    }

    if (!momoRes.ok || momoData?.resultCode !== 0 || !momoData?.payUrl) {
      await prisma.payments.update({
        where: { order_id: momoOrderId },
        data: { status: 'FAILED', gateway_response: JSON.stringify(momoData) },
      })

      return NextResponse.json(
        {
          message: 'MoMo create failed',
          momoStatus: momoRes.status,
          momoData,
          debug: {
            partnerCode,
            accessKey, // ok log
            requestType,
            momoOrderId,
            requestId,
            amount,
            rawSignature,
          },
        },
        { status: 400 },
      )
    }

    await prisma.payments.update({
      where: { order_id: momoOrderId },
      data: { gateway_response: JSON.stringify(momoData) },
    })

    return NextResponse.json({
      payUrl: momoData.payUrl,
      deeplink: momoData.deeplink,
      qrCodeUrl: momoData.qrCodeUrl,
      orderId: momoOrderId,
      requestId,
      amount,
    })
  } catch (e: any) {
    console.error('MOMO CREATE ERROR:', e)
    return NextResponse.json(
      { message: 'MoMo error', detail: String(e?.message ?? e) },
      { status: 500 },
    )
  }
}
