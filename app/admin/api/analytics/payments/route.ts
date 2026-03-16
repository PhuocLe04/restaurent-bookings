import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function esc(str: string) {
  return str.replace(/'/g, "''")
}

function toSqlDate(date: string | null, endOfDay = false) {
  if (!date) return null
  return endOfDay ? `${date} 23:59:59.997` : `${date} 00:00:00.000`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const from = toSqlDate(searchParams.get('from'))
    const to = toSqlDate(searchParams.get('to'), true)
    const status = searchParams.get('status')
    const purpose = searchParams.get('purpose')
    const paymentMethod = searchParams.get('payment_method')

    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') || 10)),
    )
    const offset = (page - 1) * limit

    const whereParts: string[] = ['1=1']
    if (from) whereParts.push(`p.created_at >= '${esc(from)}'`)
    if (to) whereParts.push(`p.created_at <= '${esc(to)}'`)
    if (status) whereParts.push(`p.status = '${esc(status)}'`)
    if (purpose) whereParts.push(`p.purpose = '${esc(purpose)}'`)
    if (paymentMethod)
      whereParts.push(`p.payment_method = '${esc(paymentMethod)}'`)

    const whereClause = whereParts.join(' AND ')

    const kpiSql = `
      SELECT
        ISNULL(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END), 0) AS total_collected,
        ISNULL(SUM(CASE WHEN p.status = 'SUCCESS' AND p.purpose = 'DEPOSIT' THEN p.amount ELSE 0 END), 0) AS total_deposit_collected,
        ISNULL(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END), 0) AS total_paid_success
      FROM payments p
      WHERE ${whereClause}
    `

    const remainingSql = `
      SELECT
        ISNULL(SUM(o.grand_total), 0) AS total_order_amount,
        ISNULL(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END), 0) AS total_paid,
        ISNULL(SUM(o.grand_total), 0) - ISNULL(SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END), 0) AS estimated_remaining
      FROM orders o
      LEFT JOIN payments p ON p.reservation_id = o.reservation_id
    `

    const failRateByGatewaySql = `
      SELECT
        p.payment_method,
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN p.status = 'FAILED' THEN 1 ELSE 0 END) AS failed_count,
        CAST(
          100.0 * SUM(CASE WHEN p.status = 'FAILED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)
          AS DECIMAL(5,2)
        ) AS fail_rate
      FROM payments p
      WHERE ${whereClause}
      GROUP BY p.payment_method
      ORDER BY fail_rate DESC, total_attempts DESC
    `

    const tableSql = `
      SELECT
        p.id,
        p.reservation_id,
        u.full_name AS user_name,
        p.amount,
        p.payment_method,
        p.purpose,
        p.status,
        p.order_id,
        p.request_id,
        p.partner_transaction_id,
        p.created_at,
        p.paid_at
      FROM payments p
      INNER JOIN users u ON u.id = p.user_id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `

    const countSql = `
      SELECT COUNT(*) AS total
      FROM payments p
      WHERE ${whereClause}
    `

    const depositStatusByReservationSql = `
      SELECT
        r.id AS reservation_id,
        u.full_name AS user_name,
        ISNULL(o.grand_total, 0) AS order_total,
        ISNULL(dep.deposit_paid, 0) AS deposit_paid,
        ISNULL(pay.total_paid, 0) AS total_paid,
        CASE
          WHEN ISNULL(dep.deposit_paid, 0) > 0 THEN N'Đã cọc'
          ELSE N'Chưa cọc'
        END AS deposit_status,
        ISNULL(o.grand_total, 0) - ISNULL(pay.total_paid, 0) AS remaining_amount
      FROM reservations r
      INNER JOIN users u ON u.id = r.user_id
      OUTER APPLY (
        SELECT TOP 1 grand_total
        FROM orders o
        WHERE o.reservation_id = r.id
        ORDER BY o.id DESC
      ) o
      OUTER APPLY (
        SELECT SUM(CASE WHEN p.status = 'SUCCESS' AND p.purpose = 'DEPOSIT' THEN p.amount ELSE 0 END) AS deposit_paid
        FROM payments p
        WHERE p.reservation_id = r.id
      ) dep
      OUTER APPLY (
        SELECT SUM(CASE WHEN p.status = 'SUCCESS' THEN p.amount ELSE 0 END) AS total_paid
        FROM payments p
        WHERE p.reservation_id = r.id
      ) pay
      ORDER BY r.id DESC
    `

    const [
      kpis,
      remainings,
      failRateByGateway,
      rows,
      totalRows,
      depositByReservation,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(kpiSql),
      prisma.$queryRawUnsafe<any[]>(remainingSql),
      prisma.$queryRawUnsafe<any[]>(failRateByGatewaySql),
      prisma.$queryRawUnsafe<any[]>(tableSql),
      prisma.$queryRawUnsafe<any[]>(countSql),
      prisma.$queryRawUnsafe<any[]>(depositStatusByReservationSql),
    ])

    const total = Number(totalRows?.[0]?.total || 0)

    return NextResponse.json({
      filters: {
        from,
        to,
        status,
        purpose,
        paymentMethod,
        page,
        limit,
      },
      kpis: {
        ...(kpis?.[0] || {}),
        ...(remainings?.[0] || {}),
      },
      charts: {
        failRateByGateway,
      },
      table: {
        items: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      reservationDepositStatus: depositByReservation,
      note: 'payments.order_id đang unique là hợp lý nếu mỗi lần thanh toán sinh một momoOrderId riêng.',
    })
  } catch (error: any) {
    console.error('GET /api/analytics/payments error:', error)
    return NextResponse.json(
      {
        message: 'Không thể tải thống kê thanh toán',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
