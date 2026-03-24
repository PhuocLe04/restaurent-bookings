import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

type Quick = 'today' | '7d' | '30d'
type QuickOrCustom = Quick | 'custom'

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh'
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

const DEFAULT_STATUS_KEYS = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const

function getVNNow() {
  return new Date(Date.now() + VN_OFFSET_MS)
}

function getUTCPartsFromVNShifted(date: Date) {
  return {
    y: date.getUTCFullYear(),
    m: date.getUTCMonth(),
    d: date.getUTCDate(),
  }
}

function startOfVNDay(date: Date) {
  const { y, m, d } = getUTCPartsFromVNShifted(date)
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - VN_OFFSET_MS)
}

function endOfVNDay(date: Date) {
  const { y, m, d } = getUTCPartsFromVNShifted(date)
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - VN_OFFSET_MS)
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

function parseDateOnly(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null

  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year, month, day }
}

function startOfVNDateString(value: string) {
  const parsed = parseDateOnly(value)
  if (!parsed) return null

  const { year, month, day } = parsed
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - VN_OFFSET_MS)
}

function endOfVNDateString(value: string) {
  const parsed = parseDateOnly(value)
  if (!parsed) return null

  const { year, month, day } = parsed
  return new Date(
    Date.UTC(year, month - 1, day, 23, 59, 59, 999) - VN_OFFSET_MS,
  )
}

function formatVNDateKey(date: Date) {
  const vn = new Date(date.getTime() + VN_OFFSET_MS)
  const y = vn.getUTCFullYear()
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0')
  const d = String(vn.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildVNDateKeys(fromDate: Date, toDate: Date) {
  const keys: string[] = []
  let current = startOfVNDay(new Date(fromDate))
  const end = startOfVNDay(new Date(toDate))

  while (current.getTime() <= end.getTime()) {
    keys.push(formatVNDateKey(current))
    current = addDays(current, 1)
  }

  return keys
}

function resolveRange(
  url: URL,
):
  | { ok: true; fromDate: Date; toDate: Date; quick: QuickOrCustom }
  | { ok: false; res: NextResponse } {
  const quickParam = url.searchParams.get('quick')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if ((from && !to) || (!from && to)) {
    return {
      ok: false,
      res: NextResponse.json(
        { message: 'from và to phải đi cùng nhau' },
        { status: 400 },
      ),
    }
  }

  if (from && to) {
    const fromDate = startOfVNDateString(from)
    const toDate = endOfVNDateString(to)

    if (!fromDate || !toDate) {
      return {
        ok: false,
        res: NextResponse.json(
          { message: 'Định dạng ngày không hợp lệ. Dùng YYYY-MM-DD' },
          { status: 400 },
        ),
      }
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return {
        ok: false,
        res: NextResponse.json(
          { message: 'from không được lớn hơn to' },
          { status: 400 },
        ),
      }
    }

    return { ok: true, fromDate, toDate, quick: 'custom' }
  }

  const quick: Quick =
    quickParam === 'today' || quickParam === '7d' || quickParam === '30d'
      ? quickParam
      : 'today'

  const vnNow = getVNNow()
  const toDate = endOfVNDay(vnNow)

  let fromDate: Date
  if (quick === 'today') {
    fromDate = startOfVNDay(vnNow)
  } else if (quick === '7d') {
    fromDate = startOfVNDay(addDays(vnNow, -6))
  } else {
    fromDate = startOfVNDay(addDays(vnNow, -29))
  }

  return { ok: true, fromDate, toDate, quick }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOnly()
    if (!auth.ok) return auth.res

    const url = new URL(req.url)
    const range = resolveRange(url)
    if (!range.ok) return range.res

    const { fromDate, toDate, quick } = range

    const reservationTimeWhere = {
      reservation_time: {
        gte: fromDate,
        lte: toDate,
      },
    } as const

    const reservationsTotalPromise = prisma.reservations.count({
      where: reservationTimeWhere,
    })

    const reservationsByStatusRawPromise = prisma.reservations.groupBy({
      by: ['status'],
      where: reservationTimeWhere,
      _count: { _all: true },
    })

    const totalGuestsPromise = prisma.reservations.aggregate({
      where: reservationTimeWhere,
      _sum: { number_of_guests: true },
    })

    const noShowPromise = prisma.reservations.count({
      where: {
        reservation_time: { gte: fromDate, lte: toDate },
        status: 'NO_SHOW',
      },
    })

    const amountDuePromise = prisma.$queryRaw<Array<{ amount_due: unknown }>>`
  SELECT COALESCE(SUM(COALESCE(o.grand_total, 0)), 0) AS amount_due
  FROM orders o
  INNER JOIN reservations r ON r.id = o.reservation_id
  WHERE r.reservation_time >= ${fromDate}
    AND r.reservation_time <= ${toDate}
`

    const completedRevenuePromise = prisma.$queryRaw<
      Array<{ revenue: unknown }>
    >`
  SELECT COALESCE(SUM(COALESCE(o.grand_total, 0)), 0) AS revenue
  FROM orders o
  INNER JOIN reservations r ON r.id = o.reservation_id
  WHERE r.reservation_time >= ${fromDate}
    AND r.reservation_time <= ${toDate}
    AND r.status = N'COMPLETED'
`

    const cashInPromise = prisma.$queryRaw<Array<{ cash_in: unknown }>>`
  SELECT COALESCE(SUM(p.amount), 0) AS cash_in
  FROM payments p
  INNER JOIN reservations r ON r.id = p.reservation_id
  WHERE p.status IN (N'PAID', N'SUCCESS')
    AND p.purpose IN (N'FINAL', N'DEPOSIT')
    AND r.reservation_time >= ${fromDate}
    AND r.reservation_time <= ${toDate}
`
    const depositStatPromise = prisma.$queryRaw<
      Array<{ total_res: unknown; res_with_deposit_success: unknown }>
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
        ) AS res_with_deposit_success
    `

    const resDailyPromise = prisma.$queryRaw<
      Array<{ d: string; total: number; completed: number }>
    >`
      SELECT
        CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23) AS d,
        COUNT(*) AS total,
        SUM(CASE WHEN r.status = N'COMPLETED' THEN 1 ELSE 0 END) AS completed
      FROM reservations r
      WHERE r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate}
      GROUP BY CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23)
      ORDER BY d
    `

    const statusDailyPromise = prisma.$queryRaw<
      Array<{ d: string; status: string; cnt: number }>
    >`
      SELECT
        CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23) AS d,
        r.status AS status,
        COUNT(*) AS cnt
      FROM reservations r
      WHERE r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate}
      GROUP BY
        CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23),
        r.status
      ORDER BY d
    `

    // line "tiền đã thu" cũng chỉ lấy FINAL + DEPOSIT success
    // group theo ngày reservation để đồng bộ với amountDueLine
    const paymentDailyPromise = prisma.$queryRaw<
      Array<{ d: string; cash_in: unknown }>
    >`
      SELECT
        CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23) AS d,
        COALESCE(SUM(p.amount), 0) AS cash_in
      FROM payments p
      INNER JOIN reservations r ON r.id = p.reservation_id
      WHERE p.status IN (N'PAID', N'SUCCESS')
        AND p.purpose IN (N'FINAL', N'DEPOSIT')
        AND r.reservation_time >= ${fromDate}
        AND r.reservation_time <= ${toDate}
      GROUP BY CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23)
      ORDER BY d
    `

    const amountDueDailyPromise = prisma.$queryRaw<
      Array<{ d: string; value: unknown }>
    >`
  SELECT
    CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23) AS d,
    COALESCE(SUM(COALESCE(o.grand_total, 0)), 0) AS value
  FROM orders o
  INNER JOIN reservations r ON r.id = o.reservation_id
  WHERE r.reservation_time >= ${fromDate}
    AND r.reservation_time <= ${toDate}
  GROUP BY CONVERT(varchar(10), DATEADD(HOUR, 7, r.reservation_time), 23)
  ORDER BY d
`
    const [
      reservationsTotal,
      reservationsByStatusRaw,
      totalGuestsAgg,
      noShow,
      amountDueRow,
      completedRevenueRow,
      cashInRow,
      depositStat,
      resDaily,
      statusDaily,
      paymentDaily,
      amountDueDaily,
    ] = await Promise.all([
      reservationsTotalPromise,
      reservationsByStatusRawPromise,
      totalGuestsPromise,
      noShowPromise,
      amountDuePromise,
      completedRevenuePromise,
      cashInPromise,
      depositStatPromise,
      resDailyPromise,
      statusDailyPromise,
      paymentDailyPromise,
      amountDueDailyPromise,
    ])

    const reservationsByStatus: Record<string, number> = {}
    for (const key of DEFAULT_STATUS_KEYS) reservationsByStatus[key] = 0
    for (const row of reservationsByStatusRaw) {
      reservationsByStatus[row.status] = row._count._all
    }

    const totalGuests = Number(totalGuestsAgg._sum.number_of_guests ?? 0)
    const amountDue = Number(amountDueRow?.[0]?.amount_due ?? 0)
    const completedRevenue = Number(completedRevenueRow?.[0]?.revenue ?? 0)
    const cashIn = Number(cashInRow?.[0]?.cash_in ?? 0)

    const totalRes = Number(depositStat?.[0]?.total_res ?? 0)
    const resWithDepositSuccess = Number(
      depositStat?.[0]?.res_with_deposit_success ?? 0,
    )

    const depositSuccessRate =
      totalRes > 0
        ? Number(((resWithDepositSuccess / totalRes) * 100).toFixed(2))
        : 0

    const dateKeys = buildVNDateKeys(fromDate, toDate)

    const bookingsMap = new Map(
      resDaily.map((row) => [
        row.d,
        {
          total: Number(row.total ?? 0),
          completed: Number(row.completed ?? 0),
        },
      ]),
    )

    const bookingsLine = dateKeys.map((date) => ({
      date,
      total: bookingsMap.get(date)?.total ?? 0,
      completed: bookingsMap.get(date)?.completed ?? 0,
    }))

    const statusMap = new Map<string, Record<string, number>>()
    for (const row of statusDaily) {
      if (!statusMap.has(row.d)) statusMap.set(row.d, {})
      statusMap.get(row.d)![row.status] = Number(row.cnt ?? 0)
    }

    const reservationStatusStack = dateKeys.map((date) => {
      const row = statusMap.get(date) ?? {}
      return {
        date,
        PENDING: row.PENDING ?? 0,
        CONFIRMED: row.CONFIRMED ?? 0,
        CANCELLED: row.CANCELLED ?? 0,
        COMPLETED: row.COMPLETED ?? 0,
        NO_SHOW: row.NO_SHOW ?? 0,
      }
    })

    const paymentMap = new Map(
      paymentDaily.map((row) => [row.d, Number(row.cash_in ?? 0)]),
    )

    const cashInLine = dateKeys.map((date) => ({
      date,
      value: paymentMap.get(date) ?? 0,
    }))

    const amountDueMap = new Map(
      amountDueDaily.map((row) => [row.d, Number(row.value ?? 0)]),
    )

    const amountDueLine = dateKeys.map((date) => ({
      date,
      value: amountDueMap.get(date) ?? 0,
    }))

    return NextResponse.json({
      ok: true,
      filters: {
        quick,
        timezone: VN_TIMEZONE,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      kpis: {
        reservationsTotal,
        reservationsByStatus,
        totalGuests,
        amountDue,
        completedRevenue,
        cashIn,
        depositSuccessRate,
        noShow,
      },
      charts: {
        bookingsLine,
        reservationStatusStack,
        cashInLine,
        amountDueLine,
      },
    })
  } catch (error) {
    console.error('GET /admin/api/dashboard error:', error)
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 })
  }
}
