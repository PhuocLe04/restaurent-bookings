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
    if (from) whereParts.push(`r.created_at >= '${esc(from)}'`)
    if (to) whereParts.push(`r.created_at <= '${esc(to)}'`)
    const whereClause = whereParts.join(' AND ')

    const topServicesSql = `
      SELECT
        s.id AS service_id,
        s.name AS service_name,
        SUM(rs.quantity) AS total_quantity,
        CAST(SUM(rs.quantity * rs.unit_price) AS DECIMAL(18,2)) AS total_revenue
      FROM reservations r
      INNER JOIN reservation_services rs ON rs.reservation_id = r.id
      INNER JOIN services s ON s.id = rs.service_id
      WHERE ${whereClause}
      GROUP BY s.id, s.name
      ORDER BY total_quantity DESC, total_revenue DESC
    `

    const serviceRevenueByDaySql = `
      SELECT
        CAST(r.created_at AS DATE) AS [date],
        CAST(SUM(rs.quantity * rs.unit_price) AS DECIMAL(18,2)) AS revenue
      FROM reservations r
      INNER JOIN reservation_services rs ON rs.reservation_id = r.id
      WHERE ${whereClause}
      GROUP BY CAST(r.created_at AS DATE)
      ORDER BY [date]
    `

    const summarySql = `
      SELECT
        ISNULL(SUM(rs.quantity), 0) AS total_service_quantity,
        ISNULL(CAST(SUM(rs.quantity * rs.unit_price) AS DECIMAL(18,2)), 0) AS total_service_revenue,
        COUNT(DISTINCT rs.reservation_id) AS reservations_with_services
      FROM reservations r
      INNER JOIN reservation_services rs ON rs.reservation_id = r.id
      WHERE ${whereClause}
    `

    const combosSql = `
      SELECT
        c.id,
        c.title,
        c.sale_price,
        c.total_origin_price,
        c.discount_percent,
        c.is_active
      FROM combo c
      ORDER BY c.id DESC
    `

    const comboItemsSql = `
      SELECT
        c.id AS combo_id,
        c.title,
        COUNT(DISTINCT cmi.menu_item_id) AS total_menu_items,
        COUNT(DISTINCT cs.service_id) AS total_services,
        CAST(ISNULL(SUM(cmi.quantity * cmi.unit_price), 0) AS DECIMAL(18,2)) AS menu_items_value,
        CAST(ISNULL(SUM(cs.quantity * cs.unit_price), 0) AS DECIMAL(18,2)) AS services_value
      FROM combo c
      LEFT JOIN combo_menu_items cmi ON cmi.combo_id = c.id
      LEFT JOIN combo_services cs ON cs.combo_id = c.id
      GROUP BY c.id, c.title
      ORDER BY c.id DESC
    `

    const [summary, topServices, serviceRevenueByDay, combos, comboItems] =
      await Promise.all([
        prisma.$queryRawUnsafe<any[]>(summarySql),
        prisma.$queryRawUnsafe<any[]>(topServicesSql),
        prisma.$queryRawUnsafe<any[]>(serviceRevenueByDaySql),
        prisma.$queryRawUnsafe<any[]>(combosSql),
        prisma.$queryRawUnsafe<any[]>(comboItemsSql),
      ])

    return NextResponse.json({
      filters: { from, to },
      kpis: summary?.[0] || {
        total_service_quantity: 0,
        total_service_revenue: 0,
        reservations_with_services: 0,
      },
      charts: {
        serviceRevenueByDay,
      },
      tables: {
        topServices,
        combos,
        comboItems,
      },
      note: [
        'Hiện schema chưa có bảng reservation_combos nên chưa thể thống kê combo theo đặt bàn một cách chuẩn.',
        'Nếu muốn dashboard combo chuẩn, nên thêm bảng reservation_combos(reservation_id, combo_id, quantity, unit_price).',
      ],
    })
  } catch (error: any) {
    console.error('GET /api/analytics/upsell error:', error)
    return NextResponse.json(
      {
        message: 'Không thể tải thống kê dịch vụ & combo',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
