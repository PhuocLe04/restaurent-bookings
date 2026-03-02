// (src/)app/api/combos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function parseBool(v: string | null): boolean | null {
  if (v == null) return null
  const s = v.trim().toLowerCase()
  if (s === 'true' || s === '1') return true
  if (s === 'false' || s === '0') return false
  return null
}

// convert Prisma.Decimal -> number safely (or keep as string if you prefer)
function decToNumber(d: any) {
  // Prisma Decimal has .toNumber() / .toString()
  if (d && typeof d === 'object') {
    if (typeof d.toNumber === 'function') return d.toNumber()
    if (typeof d.toString === 'function') return Number(d.toString())
  }
  return Number(d)
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
    const active = parseBool(req.nextUrl.searchParams.get('active'))

    const where: Prisma.comboWhereInput = {
      is_active: active ?? true,
      ...(q
        ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] }
        : {}),
    }

    const rows = await prisma.combo.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        total_origin_price: true,
        sale_price: true,
        discount_percent: true,
        is_active: true,
        created_at: true,
      },
      orderBy: [
        { is_active: 'desc' },
        { discount_percent: 'desc' },
        { id: 'asc' },
      ],
    })

    // đảm bảo JSON “đẹp” cho client: Decimal -> number, Date -> ISO string
    const combos = rows.map((c) => ({
      ...c,
      total_origin_price: decToNumber(c.total_origin_price),
      sale_price: decToNumber(c.sale_price),
      discount_percent:
        c.discount_percent == null ? null : decToNumber(c.discount_percent),
      created_at:
        c.created_at instanceof Date
          ? c.created_at.toISOString()
          : c.created_at,
    }))

    return NextResponse.json({ combos })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { message: 'Failed to fetch combos', error: message },
      { status: 500 },
    )
  }
}
