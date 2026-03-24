import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function normalizeFileUrl(value: string | null | undefined, req: Request) {
  if (!value) return null

  const raw = value.trim()
  if (!raw) return null

  // base64
  if (raw.startsWith('data:image/')) return raw

  // URL đầy đủ
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw
  }

  const origin = new URL(req.url).origin

  // path local có sẵn dấu /
  if (raw.startsWith('/')) {
    return `${origin}${raw}`
  }

  // path local thiếu dấu /
  return `${origin}/${raw}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit') ?? 10)),
    )
    const q = (searchParams.get('q') ?? '').trim()

    const where = {
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
          users: {
            select: {
              id: true,
              full_name: true,
              avatar: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: data.map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        short_description: b.short_description,
        thumbnail_url: normalizeFileUrl(b.thumbnail_url, req),
        status: b.status,
        published_at: b.published_at,
        created_at: b.created_at,
        updated_at: b.updated_at,
        author: b.users
          ? {
              id: b.users.id,
              full_name: b.users.full_name,
              avatar: normalizeFileUrl(b.users.avatar, req),
            }
          : null,
      })),
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
