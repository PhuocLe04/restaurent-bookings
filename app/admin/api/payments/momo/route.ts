import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

type CreateBody = {
  order_id?: number | string
  payment_method?: 'MOMO' | 'CASH'
  redirect_url?: string
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

function isSuccessfulPaymentStatus(status?: string | null) {
  const s = String(status || '').toUpperCase()
  return s === 'SUCCESS' || s === 'PAID'
}

function getBaseUrl(req: Request) {
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL

  if (envBase) return envBase.replace(/\/+$/, '')

  const url = new URL(req.url)
  return url.origin
}

function normalizeRedirectUrl(req: Request, redirectUrl?: string) {
  const raw = String(redirectUrl || '').trim()

  if (raw) {
    if (/^https?:\/\//i.test(raw)) return raw
    const baseUrl = getBaseUrl(req)
    const path = raw.startsWith('/') ? raw : `/${raw}`
    return `${baseUrl}${path}`
  }

  const baseUrl = getBaseUrl(req)
  return `${baseUrl}/admin/payments/components/return?method=momo&purpose=FINAL`
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
    const redirectUrl = normalizeRedirectUrl(req, body?.redirect_url)

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
        status: true,
      },
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const grandTotal = Math.round(Number(order.grand_total ?? 0))
    if (grandTotal <= 0) {
      return NextResponse.json(
        { message: 'Invalid grand total' },
        { status: 400 },
      )
    }

    const depositPayments = await prisma.payments.findMany({
      where: {
        reservation_id: order.reservation_id,
        user_id: order.user_id,
        purpose: 'DEPOSIT',
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    })

    const paidDepositTotal = depositPayments
      .filter((p) => isSuccessfulPaymentStatus(p.status))
      .reduce((sum, p) => sum + Math.round(Number(p.amount ?? 0)), 0)

    const amount = Math.max(0, grandTotal - paidDepositTotal)

    if (amount <= 0) {
      return NextResponse.json(
        {
          message:
            'Order đã được thanh toán đủ, không còn số tiền cần thanh toán',
          grand_total: grandTotal,
          paid_deposit_total: paidDepositTotal,
          remaining_amount: 0,
        },
        { status: 400 },
      )
    }

    const existingFinalPayment = await prisma.payments.findFirst({
      where: {
        reservation_id: order.reservation_id,
        user_id: order.user_id,
        purpose: 'FINAL',
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
      orderBy: {
        id: 'desc',
      },
    })

    if (
      existingFinalPayment &&
      isSuccessfulPaymentStatus(existingFinalPayment.status)
    ) {
      return NextResponse.json(
        {
          message: 'Order này đã có thanh toán cuối thành công',
          payment_id: existingFinalPayment.id,
          amount: Number(existingFinalPayment.amount ?? 0),
          status: existingFinalPayment.status,
        },
        { status: 400 },
      )
    }

    if (paymentMethod === 'CASH') {
      const now = Date.now()
      const cashOrderId = `FINAL_CASH_${order.id}_${now}`
      const requestId = `FINAL_CASH_REQ_${order.id}_${now}`

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.create({
          data: {
            reservation_id: order.reservation_id,
            user_id: order.user_id,
            amount,
            payment_method: 'CASH',
            purpose: 'FINAL',
            status: 'SUCCESS',
            order_id: cashOrderId,
            request_id: requestId,
            gateway_response: JSON.stringify({
              type: 'OFFLINE_CASH',
              note: 'Thanh toán cuối bằng tiền mặt thành công',
              grand_total: grandTotal,
              paid_deposit_total: paidDepositTotal,
              final_amount: amount,
              redirect_url: redirectUrl,
            }),
            paid_at: new Date(),
          },
        })

        await tx.orders.update({
          where: { id: order.id },
          data: { status: 'CLOSED' },
        })

        await tx.reservations.update({
          where: { id: order.reservation_id },
          data: { status: 'COMPLETED' },
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
        message: 'Thanh toán cuối bằng tiền mặt thành công',
        payment_method: 'CASH',
        payment_id: result.payment.id,
        order_id: cashOrderId,
        request_id: requestId,
        purpose: 'FINAL',
        amount,
        grand_total: grandTotal,
        paid_deposit_total: paidDepositTotal,
        remaining_before_payment: amount,
        need_redirect: false,
        status: 'SUCCESS',
        reservation_id: order.reservation_id,
        reservation_status: 'COMPLETED',
        order_status: 'CLOSED',
        redirect_url: redirectUrl,
        membership_point_added: result.membershipResult.earnedPoints,
        member_point: result.membershipResult.totalPoints,
        membership: result.membershipResult.membership,
      })
    }

    const partnerCode = mustEnv('MOMO_PARTNER_CODE')
    const accessKey = mustEnv('MOMO_ACCESS_KEY')
    const secretKey = mustEnv('MOMO_SECRET_KEY')
    const endpoint = mustEnv('MOMO_ENDPOINT')
    const ipnUrl = mustEnv('MOMO_IPN_URL')

    const now = Date.now()
    const requestId = `FINAL-${order.id}-${now}`
    const momoOrderId = `FINAL_ORDER_${order.id}_${now}`

    const orderInfo = `Final payment for order #${order.id}`
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
        purpose: 'FINAL',
        status: 'PENDING',
        order_id: momoOrderId,
        request_id: requestId,
        gateway_response: JSON.stringify({
          grand_total: grandTotal,
          paid_deposit_total: paidDepositTotal,
          final_amount: amount,
          redirect_url: redirectUrl,
        }),
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
        data: {
          status: 'FAILED',
          gateway_response: momoText,
        },
      })

      return NextResponse.json(
        { message: 'MoMo returned non-JSON', momoStatus: momoRes.status },
        { status: 502 },
      )
    }

    if (!momoRes.ok || momoData?.resultCode !== 0 || !momoData?.payUrl) {
      await prisma.payments.update({
        where: { order_id: momoOrderId },
        data: {
          status: 'FAILED',
          gateway_response: JSON.stringify({
            ...momoData,
            redirect_url: redirectUrl,
          }),
        },
      })

      return NextResponse.json(
        {
          message: 'MoMo create final payment failed',
          momoStatus: momoRes.status,
          momoData,
        },
        { status: 400 },
      )
    }

    await prisma.payments.update({
      where: { order_id: momoOrderId },
      data: {
        gateway_response: JSON.stringify({
          ...momoData,
          grand_total: grandTotal,
          paid_deposit_total: paidDepositTotal,
          final_amount: amount,
          redirect_url: redirectUrl,
        }),
      },
    })

    return NextResponse.json({
      payment_method: 'MOMO',
      purpose: 'FINAL',
      payUrl: momoData.payUrl,
      deeplink: momoData.deeplink,
      qrCodeUrl: momoData.qrCodeUrl,
      orderId: momoOrderId,
      requestId,
      amount,
      grand_total: grandTotal,
      paid_deposit_total: paidDepositTotal,
      remaining_before_payment: amount,
      need_redirect: true,
      status: 'PENDING',
      reservation_id: order.reservation_id,
      redirect_url: redirectUrl,
    })
  } catch (e: any) {
    console.error('FINAL PAYMENT CREATE ERROR:', e)
    return NextResponse.json(
      { message: 'Payment error', detail: String(e?.message ?? e) },
      { status: 500 },
    )
  }
}
