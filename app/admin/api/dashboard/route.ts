import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Quick = 'today' | '7d' | '30d'
type QuickOrCustom = Quick | 'custom'

const DEFAULT_STATUS_KEYS = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function formatLocalISOString(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}.${ms}`
}

function parseRange(url: URL) {
  const quick = (url.searchParams.get('quick') as Quick) || 'today'
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if (from && to) {
    const fromDate = startOfDay(new Date(`${from}T00:00:00`))
    const toDate = endOfDay(new Date(`${to}T00:00:00`))

    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      return { fromDate, toDate, quick: 'custom' as QuickOrCustom }
    }
  }

  const now = new Date()
  const toDate = endOfDay(now)

  let fromDate: Date
  if (quick === 'today') {
    fromDate = startOfDay(now)
  } else if (quick === '7d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    fromDate = startOfDay(d)
  } else {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    fromDate = startOfDay(d)
  }

  return { fromDate, toDate, quick }
}

function toISODateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function makeDateKeys(fromDate: Date, toDate: Date) {
  const keys: string[] = []
  const cur = startOfDay(fromDate)
  const end = startOfDay(toDate)

  while (cur.getTime() <= end.getTime()) {
    keys.push(toISODateKey(cur))
    cur.setDate(cur.getDate() + 1)
  }

  return keys
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const { fromDate, toDate, quick } = parseRange(url)
    const now = new Date()

    const reservationsWhere = {
      reservation_time: { gte: fromDate, lte: toDate },
    } as const

    // =========================
    // 1) KPI tổng quan
    // =========================

    const reservationsTotal = await prisma.reservations.count({
      where: reservationsWhere,
    })

    const reservationsByStatusRaw = await prisma.reservations.groupBy({
      by: ['status'],
      where: reservationsWhere,
      _count: { _all: true },
    })

    const reservationsByStatus: Record<string, number> = {}
    for (const key of DEFAULT_STATUS_KEYS) reservationsByStatus[key] = 0
    for (const row of reservationsByStatusRaw) {
      reservationsByStatus[row.status] = row._count._all
    }

    const guestsAgg = await prisma.reservations.aggregate({
      where: reservationsWhere,
      _sum: { number_of_guests: true },
    })
    const totalGuests = Number(guestsAgg._sum.number_of_guests ?? 0)

    const revenueRow = await prisma.$queryRaw<Array<{ revenue: any }>>`
      SELECT COALESCE(SUM(o.grand_total), 0) AS revenue
      FROM orders o
      INNER JOIN reservations r ON r.id = o.reservation_id
      WHERE r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate};
    `
    const estimatedRevenue = Number(revenueRow?.[0]?.revenue ?? 0)

    const cashInRow = await prisma.$queryRaw<Array<{ cash_in: any }>>`
      SELECT COALESCE(SUM(p.amount), 0) AS cash_in
      FROM payments p
      WHERE p.status IN (N'PAID', N'SUCCESS')
        AND (
          (p.paid_at IS NOT NULL AND p.paid_at >= ${fromDate} AND p.paid_at <= ${toDate})
          OR
          (p.paid_at IS NULL AND p.created_at >= ${fromDate} AND p.created_at <= ${toDate})
        );
    `
    const cashIn = Number(cashInRow?.[0]?.cash_in ?? 0)

    const depositStat = await prisma.$queryRaw<
      Array<{ total_res: any; res_with_deposit_success: any }>
    >`
      WITH res_in_range AS (
        SELECT r.id
        FROM reservations r
        WHERE r.reservation_time >= ${fromDate}
          AND r.reservation_time <= ${toDate}
      ),
      res_deposit_success AS (
        SELECT DISTINCT p.reservation_id AS id
        FROM payments p
        WHERE p.purpose = N'DEPOSIT'
          AND p.status IN (N'PAID', N'SUCCESS')
      )
      SELECT
        (SELECT COUNT(*) FROM res_in_range) AS total_res,
        (
          SELECT COUNT(*)
          FROM res_in_range r
          INNER JOIN res_deposit_success d ON d.id = r.id
        ) AS res_with_deposit_success;
    `

    const totalRes = Number(depositStat?.[0]?.total_res ?? 0)
    const resWithDepositSuccess = Number(
      depositStat?.[0]?.res_with_deposit_success ?? 0,
    )
    const depositSuccessRate =
      totalRes > 0
        ? Number(((resWithDepositSuccess / totalRes) * 100).toFixed(2))
        : 0

    const noShow = await prisma.reservations.count({
      where: {
        reservation_time: { gte: fromDate, lte: toDate, lt: now },
        checked_in_at: null,
        NOT: {
          status: {
            in: ['CANCELLED', 'COMPLETED', 'NO_SHOW'],
          },
        },
      },
    })

    // =========================
    // 2) SERIES BIỂU ĐỒ
    // =========================

    const dateKeys = makeDateKeys(fromDate, toDate)

    const resDaily = await prisma.$queryRaw<
      Array<{ d: string; total: number; completed: number }>
    >`
      SELECT
        CONVERT(varchar(10), r.reservation_time, 23) AS d,
        COUNT(*) AS total,
        SUM(CASE WHEN r.status = N'COMPLETED' THEN 1 ELSE 0 END) AS completed
      FROM reservations r
      WHERE r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate}
      GROUP BY CONVERT(varchar(10), r.reservation_time, 23)
      ORDER BY d;
    `

    const resDailyMap = new Map(
      resDaily.map((x) => [
        x.d,
        {
          total: Number(x.total),
          completed: Number(x.completed),
        },
      ]),
    )

    const bookingsLine = dateKeys.map((d) => ({
      date: d,
      total: resDailyMap.get(d)?.total ?? 0,
      completed: resDailyMap.get(d)?.completed ?? 0,
    }))

    const statusDaily = await prisma.$queryRaw<
      Array<{ d: string; status: string; cnt: number }>
    >`
      SELECT
        CONVERT(varchar(10), r.reservation_time, 23) AS d,
        r.status AS status,
        COUNT(*) AS cnt
      FROM reservations r
      WHERE r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate}
      GROUP BY CONVERT(varchar(10), r.reservation_time, 23), r.status
      ORDER BY d;
    `

    const dynamicStatusSet = Array.from(
      new Set([...DEFAULT_STATUS_KEYS, ...statusDaily.map((x) => x.status)]),
    )

    const statusByDate = new Map<string, Record<string, number>>()
    for (const row of statusDaily) {
      const d = row.d
      const s = row.status
      const cnt = Number(row.cnt)

      if (!statusByDate.has(d)) statusByDate.set(d, {})
      statusByDate.get(d)![s] = cnt
    }

    const bookingsStacked = dateKeys.map((d) => {
      const obj: Record<string, any> = { date: d }
      const m = statusByDate.get(d) || {}
      for (const s of dynamicStatusSet) obj[s] = m[s] ?? 0
      return obj
    })

    const revenueDaily = await prisma.$queryRaw<
      Array<{ d: string; revenue: any }>
    >`
      SELECT
        CONVERT(varchar(10), r.reservation_time, 23) AS d,
        COALESCE(SUM(o.grand_total), 0) AS revenue
      FROM orders o
      INNER JOIN reservations r ON r.id = o.reservation_id
      WHERE r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate}
      GROUP BY CONVERT(varchar(10), r.reservation_time, 23)
      ORDER BY d;
    `

    const cashInDaily = await prisma.$queryRaw<
      Array<{ d: string; cash_in: any }>
    >`
      SELECT
        CONVERT(varchar(10), COALESCE(p.paid_at, p.created_at), 23) AS d,
        COALESCE(SUM(p.amount), 0) AS cash_in
      FROM payments p
      WHERE p.status IN (N'PAID', N'SUCCESS')
        AND COALESCE(p.paid_at, p.created_at) >= ${fromDate}
        AND COALESCE(p.paid_at, p.created_at) <= ${toDate}
      GROUP BY CONVERT(varchar(10), COALESCE(p.paid_at, p.created_at), 23)
      ORDER BY d;
    `

    const revenueMap = new Map(
      revenueDaily.map((x) => [x.d, Number(x.revenue ?? 0)]),
    )
    const cashInMap = new Map(
      cashInDaily.map((x) => [x.d, Number(x.cash_in ?? 0)]),
    )

    const moneyLine = dateKeys.map((d) => ({
      date: d,
      revenue: revenueMap.get(d) ?? 0,
      cashIn: cashInMap.get(d) ?? 0,
    }))

    const paymentMethod = await prisma.$queryRaw<
      Array<{ payment_method: string | null; amount: any }>
    >`
      SELECT
        p.payment_method,
        COALESCE(SUM(p.amount), 0) AS amount
      FROM payments p
      WHERE p.status IN (N'PAID', N'SUCCESS')
        AND COALESCE(p.paid_at, p.created_at) >= ${fromDate}
        AND COALESCE(p.paid_at, p.created_at) <= ${toDate}
      GROUP BY p.payment_method
      ORDER BY amount DESC;
    `

    const paymentDonut = paymentMethod.map((x) => ({
      method: x.payment_method || 'UNKNOWN',
      amount: Number(x.amount ?? 0),
    }))

    const paymentPurpose = await prisma.$queryRaw<
      Array<{ purpose: string | null; amount: any }>
    >`
      SELECT
        p.purpose,
        COALESCE(SUM(p.amount), 0) AS amount
      FROM payments p
      WHERE p.status IN (N'PAID', N'SUCCESS')
        AND COALESCE(p.paid_at, p.created_at) >= ${fromDate}
        AND COALESCE(p.paid_at, p.created_at) <= ${toDate}
      GROUP BY p.purpose
      ORDER BY amount DESC;
    `

    const paymentPurposeDonut = paymentPurpose.map((x) => ({
      purpose: x.purpose || 'UNKNOWN',
      amount: Number(x.amount ?? 0),
    }))

    return NextResponse.json({
      range: {
        quick,
        from: formatLocalISOString(fromDate),
        to: formatLocalISOString(toDate),
      },
      kpi: {
        reservationsTotal,
        reservationsByStatus,
        totalGuests,
        estimatedRevenue,
        cashIn,
        depositSuccessRate, // %
        noShow,
        resWithDepositSuccess,
      },
      charts: {
        bookingsLine,
        bookingsStacked,
        moneyLine,
        paymentDonut,
        paymentPurposeDonut,
      },
      meta: {
        statusKeys: dynamicStatusSet,
      },
    })
  } catch (e: any) {
    console.error('GET admin/api/dashboard error:', e)
    return NextResponse.json(
      {
        message: 'Lỗi dashboard',
        detail: e?.message ?? String(e),
      },
      { status: 500 },
    )
  }
}
