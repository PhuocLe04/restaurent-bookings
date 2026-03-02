import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // query params
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit') ?? 10)),
    )
    const q = (searchParams.get('q') ?? '').trim()

    const where: any = {
      status: 'PUBLISHED',
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { short_description: { contains: q } },
            ],
          }
        : {}),
    }

    const [total, data] = await Promise.all([
      prisma.blogs.count({ where }),
      prisma.blogs.findMany({
        where,
        orderBy: { published_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          short_description: true,
          thumbnail_url: true,
          status: true,
          published_at: true,
          created_at: true,
          updated_at: true,
          users: { select: { id: true, full_name: true, avatar: true } },
        },
      }),
    ])

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: data.map((b) => ({
        ...b,
        author: b.users
          ? {
              id: b.users.id,
              full_name: b.users.full_name,
              avatar: b.users.avatar,
            }
          : null,
        users: undefined,
      })),
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
