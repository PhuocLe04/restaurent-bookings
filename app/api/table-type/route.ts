import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const types = await prisma.table_types.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json({ types }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/table-types] error:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
