import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { requireAdminOrStaff } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

function toNumber(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
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

async function parseUserIdFromCookies(): Promise<number | null> {
  const cookieStore = await cookies()

  const raw =
    cookieStore.get('web_user_id')?.value ?? cookieStore.get('user_id')?.value

  if (!raw) return null

  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function getCurrentUser() {
  const userId = await parseUserIdFromCookies()
  if (!userId) return null

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
    },
  })
}

export async function GET(req: Request) {
  try {
    const access = await requireAdminOrStaff()
    if (!access.ok) return access.res

    const { searchParams } = new URL(req.url)

    const page = toNumber(searchParams.get('page'), 1)
    const limit = toNumber(searchParams.get('limit'), 10)
    const skip = (page - 1) * limit

    const keyword = normalizeString(searchParams.get('keyword'))
    const status = normalizeString(searchParams.get('status'))
    const purpose = normalizeString(searchParams.get('purpose'))
    const payment_method = normalizeString(searchParams.get('payment_method'))

    const reservation_id_raw = searchParams.get('reservation_id')
    const user_id_raw = searchParams.get('user_id')

    const reservation_id =
      reservation_id_raw && Number.isFinite(Number(reservation_id_raw))
        ? Number(reservation_id_raw)
        : null

    const user_id =
      user_id_raw && Number.isFinite(Number(user_id_raw))
        ? Number(user_id_raw)
        : null

    const where: any = {
      ...(status ? { status } : {}),
      ...(purpose ? { purpose } : {}),
      ...(payment_method ? { payment_method } : {}),
      ...(reservation_id ? { reservation_id } : {}),
      ...(user_id ? { user_id } : {}),
      ...(keyword
        ? {
            OR: [
              { order_id: { contains: keyword } },
              { request_id: { contains: keyword } },
              { partner_transaction_id: { contains: keyword } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.payments.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
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
      }),
      prisma.payments.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/payments error:', error)
    return NextResponse.json(
      { message: 'Không thể lấy danh sách thanh toán' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }

    const access = await requireAdminOrStaff()
    const isAdminOrStaff = access.ok

    const reservation_id = Number(body?.reservation_id)
    const body_user_id = Number(body?.user_id)
    const amount = toDecimalNumber(body?.amount)

    const payment_method = normalizeString(body?.payment_method)
    const purpose = normalizeString(body?.purpose)
    const status = normalizeString(body?.status)
    const order_id = normalizeString(body?.order_id)
    const request_id = normalizeString(body?.request_id)
    const partner_transaction_id = normalizeString(body?.partner_transaction_id)
    const gateway_response = body?.gateway_response
      ? typeof body.gateway_response === 'string'
        ? body.gateway_response
        : JSON.stringify(body.gateway_response)
      : null

    const paid_at = body?.paid_at ? new Date(body.paid_at) : null

    if (!Number.isFinite(reservation_id) || reservation_id <= 0) {
      return NextResponse.json(
        { message: 'reservation_id không hợp lệ' },
        { status: 400 },
      )
    }

    const user_id = isAdminOrStaff ? body_user_id : currentUser.id

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json(
        { message: 'user_id không hợp lệ' },
        { status: 400 },
      )
    }

    if (amount === null || amount < 0) {
      return NextResponse.json(
        { message: 'amount không hợp lệ' },
        { status: 400 },
      )
    }

    if (!payment_method) {
      return NextResponse.json(
        { message: 'payment_method là bắt buộc' },
        { status: 400 },
      )
    }

    if (!purpose) {
      return NextResponse.json(
        { message: 'purpose là bắt buộc' },
        { status: 400 },
      )
    }

    if (!status) {
      return NextResponse.json(
        { message: 'status là bắt buộc' },
        { status: 400 },
      )
    }

    if (!order_id) {
      return NextResponse.json(
        { message: 'order_id là bắt buộc' },
        { status: 400 },
      )
    }

    if (!request_id) {
      return NextResponse.json(
        { message: 'request_id là bắt buộc' },
        { status: 400 },
      )
    }

    const [reservation, user, existedOrderId] = await Promise.all([
      prisma.reservations.findUnique({
        where: { id: reservation_id },
        select: {
          id: true,
          user_id: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: user_id },
        select: { id: true },
      }),
      prisma.payments.findUnique({
        where: { order_id },
        select: { id: true },
      }),
    ])

    if (!reservation) {
      return NextResponse.json(
        { message: 'Không tìm thấy reservation' },
        { status: 404 },
      )
    }

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy user' },
        { status: 404 },
      )
    }

    if (existedOrderId) {
      return NextResponse.json(
        { message: 'order_id đã tồn tại' },
        { status: 409 },
      )
    }

    // User thường chỉ được tạo payment cho reservation của chính mình
    if (!isAdminOrStaff && reservation.user_id !== currentUser.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const created = await prisma.payments.create({
      data: {
        reservation_id,
        user_id,
        amount,
        payment_method,
        purpose,
        status,
        order_id,
        request_id,
        partner_transaction_id: partner_transaction_id || null,
        gateway_response,
        paid_at,
      },
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

    return NextResponse.json(
      {
        message: 'Tạo thanh toán thành công',
        data: created,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /api/payments error:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Dữ liệu bị trùng, có thể order_id đã tồn tại' },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { message: 'Không thể tạo thanh toán' },
      { status: 500 },
    )
  }
}
