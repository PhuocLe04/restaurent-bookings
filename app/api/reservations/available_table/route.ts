import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HOLD_MINUTES = 120

function toDate(v: string | null) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

type Tx = Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => any
  ? T
  : never

async function getBusyTableIds(tx: Tx, start: Date, end: Date) {
  // overlap: oldStart < newEnd && oldEnd > newStart
  const busy = await tx.reservation_tables.findMany({
    where: {
      reservations: {
        status: { in: ['pending', 'confirmed'] },
        reservation_time: { lt: end },
        reservation_endtime: { gt: start },
      },
    },
    select: { table_id: true },
  })

  return new Set(busy.map((x) => x.table_id))
}

/**
 * Chọn ĐÚNG tableCount bàn
 * - tổng capacity >= guests
 * - ưu tiên bàn nhỏ
 */
function pickTablesByCount(
  tables: { id: number; capacity: number }[],
  guests: number,
  tableCount: number,
) {
  if (tableCount <= 0) return []
  if (tableCount > guests) return []

  const sorted = [...tables].sort(
    (a, b) => a.capacity - b.capacity || a.id - b.id,
  )

  for (let i = 0; i + tableCount <= sorted.length; i++) {
    const slice = sorted.slice(i, i + tableCount)
    const sumCap = slice.reduce((s, t) => s + t.capacity, 0)
    if (sumCap >= guests) return slice
  }

  return []
}

export async function GET(req: Request) {
  const url = new URL(req.url)

  const time = toDate(url.searchParams.get('time'))
  const guests = Number(url.searchParams.get('guests') ?? '0')
  const tableTypeId = url.searchParams.get('tableTypeId')
  const tableCount = Number(url.searchParams.get('tableCount') ?? '1')

  if (!time || !guests || guests <= 0) {
    return NextResponse.json(
      { message: 'Invalid query params' },
      { status: 400 },
    )
  }

  if (!tableCount || tableCount <= 0) {
    return NextResponse.json(
      { message: 'tableCount must be >= 1' },
      { status: 400 },
    )
  }

  if (tableCount > guests) {
    return NextResponse.json(
      { message: 'Number of tables cannot exceed number of guests' },
      { status: 400 },
    )
  }

  const start = time
  const end = new Date(time.getTime() + HOLD_MINUTES * 60 * 1000)

  const data = await prisma.$transaction(
    async (tx) => {
      const busyIds = await getBusyTableIds(tx, start, end)

      const tables = await tx.restaurant_tables.findMany({
        where: {
          is_active: true,
          ...(tableTypeId ? { table_type_id: Number(tableTypeId) } : {}),
        },
        select: {
          id: true,
          table_name: true,
          capacity: true,
          table_type: {
            select: { id: true, name: true, description: true },
          },
        },
        orderBy: [{ capacity: 'asc' }, { id: 'asc' }],
      })

      const free = tables.filter((t) => !busyIds.has(t.id))

      const suggestion = pickTablesByCount(
        free.map((t) => ({ id: t.id, capacity: t.capacity })),
        guests,
        tableCount,
      )

      return {
        time: start.toISOString(),
        end: end.toISOString(),
        guests,
        tableCount,

        // ✅ luôn trả list bàn trống (để UI hiển thị)
        available: free.map((t) => ({
          id: t.id,
          table_name: t.table_name,
          capacity: t.capacity,
          table_type: t.table_type,
        })),

        // ✅ auto suggestion
        suggestion,
        suggestion_table_ids: suggestion.map((t) => t.id),
      }
    },
    { isolationLevel: 'Serializable' },
  )

  return NextResponse.json(data)
}
