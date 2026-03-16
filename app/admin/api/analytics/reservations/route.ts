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

function parseNumber(value: string | null) {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const from = toSqlDate(searchParams.get('from'))
    const to = toSqlDate(searchParams.get('to'), true)
    const status = searchParams.get('status')
    const minGuests = parseNumber(searchParams.get('minGuests'))
    const maxGuests = parseNumber(searchParams.get('maxGuests'))
    const tableTypeId = parseNumber(searchParams.get('tableTypeId'))
    const peakOnly = searchParams.get('peakOnly') === 'true'

    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get('limit') || 10)),
    )
    const offset = (page - 1) * limit

    const whereParts: string[] = ['1=1']

    if (from) whereParts.push(`r.reservation_time >= '${esc(from)}'`)
    if (to) whereParts.push(`r.reservation_time <= '${esc(to)}'`)
    if (status) whereParts.push(`r.status = '${esc(status)}'`)
    if (minGuests !== null)
      whereParts.push(`r.number_of_guests >= ${minGuests}`)
    if (maxGuests !== null)
      whereParts.push(`r.number_of_guests <= ${maxGuests}`)
    if (tableTypeId !== null) {
      whereParts.push(`
        EXISTS (
          SELECT 1
          FROM reservation_tables rt2
          INNER JOIN restaurant_tables t2 ON t2.id = rt2.table_id
          WHERE rt2.reservation_id = r.id
            AND t2.table_type_id = ${tableTypeId}
        )
      `)
    }

    if (peakOnly) {
      whereParts.push(`DATEPART(HOUR, r.reservation_time) BETWEEN 18 AND 21`)
    }

    const whereClause = whereParts.join(' AND ')

    // ===== table data =====
    const tableSql = `
      SELECT
        r.id,
        u.full_name AS customer_name,
        r.reservation_time,
        r.reservation_endtime,
        r.number_of_guests,
        r.status,
        ISNULL(tbl.tables, '') AS tables,
        ISNULL(o.grand_total, 0) AS order_total,
        CASE
          WHEN p.deposit_paid > 0 THEN N'Đã cọc'
          ELSE N'Chưa cọc'
        END AS deposit_status,
        ISNULL(p.deposit_paid, 0) AS deposit_paid
      FROM reservations r
      INNER JOIN users u ON u.id = r.user_id
      OUTER APPLY (
        SELECT STRING_AGG(t.table_name, ', ') AS tables
        FROM reservation_tables rt
        INNER JOIN restaurant_tables t ON t.id = rt.table_id
        WHERE rt.reservation_id = r.id
      ) tbl
      OUTER APPLY (
        SELECT SUM(CASE WHEN p.status = 'SUCCESS' AND p.purpose = 'DEPOSIT' THEN p.amount ELSE 0 END) AS deposit_paid
        FROM payments p
        WHERE p.reservation_id = r.id
      ) p
      OUTER APPLY (
        SELECT TOP 1 o.grand_total
        FROM orders o
        WHERE o.reservation_id = r.id
        ORDER BY o.id DESC
      ) o
      WHERE ${whereClause}
      ORDER BY r.reservation_time DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `

    const countSql = `
      SELECT COUNT(*) AS total
      FROM reservations r
      WHERE ${whereClause}
    `

    // ===== heatmap =====
    const heatmapSql = `
      SELECT
        DATEPART(WEEKDAY, r.reservation_time) AS weekday_num,
        DATENAME(WEEKDAY, r.reservation_time) AS weekday_name,
        DATEPART(HOUR, r.reservation_time) AS hour_of_day,
        COUNT(*) AS total_reservations
      FROM reservations r
      WHERE ${whereClause}
      GROUP BY DATEPART(WEEKDAY, r.reservation_time), DATENAME(WEEKDAY, r.reservation_time), DATEPART(HOUR, r.reservation_time)
      ORDER BY weekday_num, hour_of_day
    `

    // ===== cancel rate by day =====
    const cancelRateSql = `
      SELECT
        CAST(r.reservation_time AS DATE) AS [date],
        COUNT(*) AS total,
        SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        CAST(
          100.0 * SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)
          AS DECIMAL(5,2)
        ) AS cancel_rate
      FROM reservations r
      WHERE ${whereClause}
      GROUP BY CAST(r.reservation_time AS DATE)
      ORDER BY [date]
    `

    // ===== completion rate by day =====
    const completionRateSql = `
      SELECT
        CAST(r.reservation_time AS DATE) AS [date],
        COUNT(*) AS total,
        SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
        CAST(
          100.0 * SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)
          AS DECIMAL(5,2)
        ) AS completion_rate
      FROM reservations r
      WHERE ${whereClause}
      GROUP BY CAST(r.reservation_time AS DATE)
      ORDER BY [date]
    `

    // ===== most used tables =====
    const topTablesSql = `
      SELECT
        t.id AS table_id,
        t.table_name,
        t.capacity,
        COUNT(*) AS used_count
      FROM reservations r
      INNER JOIN reservation_tables rt ON rt.reservation_id = r.id
      INNER JOIN restaurant_tables t ON t.id = rt.table_id
      WHERE ${whereClause}
      GROUP BY t.id, t.table_name, t.capacity
      ORDER BY used_count DESC, t.id ASC
    `

    // ===== popular table types =====
    const tableTypesSql = `
      SELECT
        tt.id AS table_type_id,
        tt.name AS table_type_name,
        COUNT(*) AS used_count
      FROM reservations r
      INNER JOIN reservation_tables rt ON rt.reservation_id = r.id
      INNER JOIN restaurant_tables t ON t.id = rt.table_id
      INNER JOIN table_types tt ON tt.id = t.table_type_id
      WHERE ${whereClause}
      GROUP BY tt.id, tt.name
      ORDER BY used_count DESC, tt.id ASC
    `

    const [
      rows,
      totalRows,
      heatmap,
      cancelRate,
      completionRate,
      topTables,
      topTableTypes,
    ] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(tableSql),
      prisma.$queryRawUnsafe<any[]>(countSql),
      prisma.$queryRawUnsafe<any[]>(heatmapSql),
      prisma.$queryRawUnsafe<any[]>(cancelRateSql),
      prisma.$queryRawUnsafe<any[]>(completionRateSql),
      prisma.$queryRawUnsafe<any[]>(topTablesSql),
      prisma.$queryRawUnsafe<any[]>(tableTypesSql),
    ])

    const total = Number(totalRows?.[0]?.total || 0)

    return NextResponse.json({
      filters: {
        from,
        to,
        status,
        minGuests,
        maxGuests,
        tableTypeId,
        peakOnly,
        page,
        limit,
      },
      table: {
        items: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      insights: {
        heatmap,
        cancelRate,
        completionRate,
        topTables,
        topTableTypes,
      },
    })
  } catch (error: any) {
    console.error('GET /api/analytics/reservations error:', error)
    return NextResponse.json(
      {
        message: 'Không thể tải thống kê đặt bàn',
        error: error?.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
