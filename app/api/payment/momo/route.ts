import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

type CreateBody = {
  order_id?: number | string
  payment_method?: 'MOMO' | 'CASH'
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

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

async function updateUserMembershipAfterPayment(
  tx: any,
  userId: number,
  amount: number,
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      member_point: true,
      membership_id: true,
    },
  })

  if (!user) {
    throw new Error('User not found when updating membership')
  }

  const earnedPoints = Math.max(0, Math.floor(amount))
  const currentPoints = toNumber(user.member_point, 0)
  const nextPoints = currentPoints + earnedPoints

  const matchedMembership = await tx.membership.findFirst({
    where: {
      min_point: {
        lte: nextPoints,
      },
    },
    orderBy: {
      min_point: 'desc',
    },
    select: {
      id: true,
      code: true,
      name: true,
      min_point: true,
    },
  })

  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: {
      member_point: nextPoints,
      ...(matchedMembership ? { membership_id: matchedMembership.id } : {}),
    },
    select: {
      id: true,
      member_point: true,
      membership_id: true,
      membership: {
        select: {
          id: true,
          code: true,
          name: true,
          min_point: true,
          discount_percent: true,
        },
      },
    },
  })

  return {
    earnedPoints,
    totalPoints: toNumber(updatedUser.member_point, 0),
    membership: updatedUser.membership,
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as CreateBody | null
    const orderId = Number(body?.order_id)
    const paymentMethod = String(body?.payment_method ?? 'MOMO').toUpperCase()

    if (!orderId) {
      return NextResponse.json({ message: 'Missing order_id' }, { status: 400 })
    }

    if (!['MOMO', 'CASH'].includes(paymentMethod)) {
      return NextResponse.json(
        { message: 'Unsupported payment method' },
        { status: 400 },
      )
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

    // ===== CASH =====
    if (paymentMethod === 'CASH') {
      const now = Date.now()
      const cashOrderId = `CASH_${order.id}_${now}`
      const requestId = `CASH_REQ_${order.id}_${now}`

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.create({
          data: {
            reservation_id: order.reservation_id,
            user_id: order.user_id,
            amount,
            payment_method: 'CASH',
            purpose: 'DEPOSIT',
            status: 'SUCCESS',
            order_id: cashOrderId,
            request_id: requestId,
            gateway_response: JSON.stringify({
              type: 'OFFLINE_CASH',
              note: 'Thanh toán tiền mặt thành công',
            }),
            paid_at: new Date(),
          },
        })

        await tx.reservations.update({
          where: { id: order.reservation_id },
          data: {
            status: 'CONFIRMED',
          },
        })

        const membershipResult = await updateUserMembershipAfterPayment(
          tx,
          order.user_id,
          amount,
        )

        return {
          payment,
          membershipResult,
        }
      })

      return NextResponse.json({
        message: 'Thanh toán tiền mặt thành công',
        payment_method: 'CASH',
        payment_id: result.payment.id,
        order_id: cashOrderId,
        request_id: requestId,
        amount,
        need_redirect: false,
        status: 'SUCCESS',
        reservation_id: order.reservation_id,
        reservation_status: 'CONFIRMED',
        membership_point_added: result.membershipResult.earnedPoints,
        member_point: result.membershipResult.totalPoints,
        membership: result.membershipResult.membership,
      })
    }

    // ===== MOMO =====
    const partnerCode = mustEnv('MOMO_PARTNER_CODE')
    const accessKey = mustEnv('MOMO_ACCESS_KEY')
    const secretKey = mustEnv('MOMO_SECRET_KEY')
    const endpoint = mustEnv('MOMO_ENDPOINT')
    const redirectUrl = mustEnv('MOMO_RETURN_URL')
    const ipnUrl = mustEnv('MOMO_IPN_URL')

    const now = Date.now()
    const requestId = `${order.id}-${now}`
    const momoOrderId = `ORDER_${order.id}_${now}`

    const orderInfo = `Deposit payment for order #${order.id}`
    const extraData = ''
    const requestType = 'captureWallet'

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
        },
        { status: 400 },
      )
    }

    await prisma.payments.update({
      where: { order_id: momoOrderId },
      data: { gateway_response: JSON.stringify(momoData) },
    })

    return NextResponse.json({
      payment_method: 'MOMO',
      payUrl: momoData.payUrl,
      deeplink: momoData.deeplink,
      qrCodeUrl: momoData.qrCodeUrl,
      orderId: momoOrderId,
      requestId,
      amount,
      need_redirect: true,
      status: 'PENDING',
      reservation_id: order.reservation_id,
    })
  } catch (e: any) {
    console.error('PAYMENT CREATE ERROR:', e)
    return NextResponse.json(
      { message: 'Payment error', detail: String(e?.message ?? e) },
      { status: 500 },
    )
  }
}
