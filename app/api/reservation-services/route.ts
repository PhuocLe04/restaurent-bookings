import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function toBool(v: string | null) {
  if (!v) return null
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const active = toBool(url.searchParams.get('active')) // default true nếu không truyền

  const where: any = {}
  if (active === null) where.is_active = true
  else where.is_active = active

  if (q) {
    where.OR = [{ name: { contains: q } }, { description: { contains: q } }]
  }

  const services = await prisma.services.findMany({
    where,
    select: {
      id: true,
      name: true,
      image: true,
      description: true,
      price: true,
      is_active: true,
    },
    orderBy: [{ is_active: 'desc' }, { id: 'asc' }],
  })

  return NextResponse.json({ services })
}
