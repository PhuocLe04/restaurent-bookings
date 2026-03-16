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

    const whereParts: string[] = ['1=1']
    if (from) whereParts.push(`o.created_at >= '${esc(from)}'`)
    if (to) whereParts.push(`o.created_at <= '${esc(to)}'`)

    const whereClause = whereParts.join(' AND ')

    const kpiSql = `
      SELECT
        ISNULL(SUM(o.grand_total), 0) AS total_revenue,
        COUNT(*) AS total_orders,
        COUNT(DISTINCT o.reservation_id) AS reservations_with_orders,
        ISNULL(
          CAST(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT o.reservation_id), 0) AS DECIMAL(18,2)),
          0
        ) AS aov_per_reservation,
        ISNULL(
          CAST(SUM(o.grand_total) / NULLIF(SUM(r.number_of_guests), 0) AS DECIMAL(18,2)),
          0
        ) AS avg_revenue_per_guest,
        ISNULL(SUM(r.number_of_guests), 0) AS total_guests
      FROM orders o
      INNER JOIN reservations r ON r.id = o.reservation_id
      WHERE ${whereClause}
    `

    const revenueByDaySql = `
      SELECT
        CAST(o.created_at AS DATE) AS [date],
        ISNULL(SUM(o.grand_total), 0) AS revenue,
        COUNT(*) AS total_orders
      FROM orders o
      WHERE ${whereClause}
      GROUP BY CAST(o.created_at AS DATE)
      ORDER BY [date]
    `

    const aovByDaySql = `
      SELECT
        CAST(o.created_at AS DATE) AS [date],
        ISNULL(CAST(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT o.reservation_id), 0) AS DECIMAL(18,2)), 0) AS aov
      FROM orders o
      WHERE ${whereClause}
      GROUP BY CAST(o.created_at AS DATE)
      ORDER BY [date]
    `

    const topItemsSql = `
      SELECT
        mi.id AS menu_item_id,
        mi.name AS menu_item_name,
        SUM(oi.quantity) AS total_quantity,
        CAST(SUM(oi.quantity * mi.price) AS DECIMAL(18,2)) AS total_revenue
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.id
      INNER JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE ${whereClause}
      GROUP BY mi.id, mi.name
      ORDER BY total_quantity DESC, total_revenue DESC
    `

    const topOrdersSql = `
      SELECT TOP 20
        o.id,
        o.reservation_id,
        u.full_name AS customer_name,
        o.status,
        o.grand_total,
        r.number_of_guests,
        o.created_at
      FROM orders o
      INNER JOIN reservations r ON r.id = o.reservation_id
      INNER JOIN users u ON u.id = o.user_id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
    `

    const [kpi, revenueByDay, aovByDay, topItems, topOrders] =
      await Promise.all([
        prisma.$queryRawUnsafe<any[]>(kpiSql),
        prisma.$queryRawUnsafe<any[]>(revenueByDaySql),
        prisma.$queryRawUnsafe<any[]>(aovByDaySql),
        prisma.$queryRawUnsafe<any[]>(topItemsSql),
        prisma.$queryRawUnsafe<any[]>(topOrdersSql),
      ])

    return NextResponse.json({
      filters: { from, to },
      kpis: kpi?.[0] || {
        total_revenue: 0,
        total_orders: 0,
        reservations_with_orders: 0,
        aov_per_reservation: 0,
        avg_revenue_per_guest: 0,
        total_guests: 0,
      },
      charts: {
        revenueByDay,
        aovByDay,
      },
      tables: {
        topItems,
        topOrders,
      },
      note: 'Hiện doanh thu top món đang tính theo menu_items.price. Nếu sau này order_items có unit_price thì nên đổi sang SUM(quantity * unit_price) để chuẩn lịch sử giá.',
    })
  } catch (error: any) {
    console.error('GET /api/analytics/revenue error:', error)
    return NextResponse.json(
      {
        message: 'Không thể tải thống kê doanh thu',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
