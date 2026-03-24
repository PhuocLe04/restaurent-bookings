import { prisma } from '@/lib/prisma'

export type MomoReturnParams = {
  partnerCode?: string
  orderId?: string
  requestId?: string
  amount?: string
  orderInfo?: string
  orderType?: string
  transId?: string
  resultCode?: string
  message?: string
  payType?: string
  responseTime?: string
  extraData?: string
  signature?: string
}

export function pick(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

export function mapMomoStatus(resultCode?: string) {
  return resultCode === '0' ? 'SUCCESS' : 'FAILED'
}

export async function updatePaymentFromMomoReturn(params: MomoReturnParams) {
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature,
  } = params

  const nextStatus = mapMomoStatus(resultCode)

  let payment = null

  if (orderId) {
    payment = await prisma.payments.findFirst({
      where: { order_id: orderId },
    })
  }

  if (!payment && requestId) {
    payment = await prisma.payments.findFirst({
      where: { request_id: requestId },
    })
  }

  if (!payment) {
    return {
      ok: false,
      reason: 'PAYMENT_NOT_FOUND',
      status: nextStatus,
    }
  }

  // Nếu đã SUCCESS rồi thì không ghi đè ngược thành FAILED
  if (payment.status === 'SUCCESS') {
    return {
      ok: true,
      reason: 'ALREADY_SUCCESS',
      status: payment.status,
      payment,
    }
  }

  const gatewayResponse = JSON.stringify({
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature,
    source: 'MOMO_RETURN',
  })

  const updated = await prisma.payments.update({
    where: { id: payment.id },
    data: {
      status: nextStatus,
      partner_transaction_id: transId || payment.partner_transaction_id,
      gateway_response: gatewayResponse,
      paid_at: nextStatus === 'SUCCESS' ? new Date() : payment.paid_at,
    },
  })

  return {
    ok: true,
    reason: 'UPDATED',
    status: updated.status,
    payment: updated,
  }
}
