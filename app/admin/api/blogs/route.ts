import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toNumber(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const page = toNumber(searchParams.get('page'), 1)
    const limit = toNumber(searchParams.get('limit'), 10)

    const skip = (page - 1) * limit

    const keyword = normalizeString(searchParams.get('keyword'))
    const status = normalizeString(searchParams.get('status'))

    const where: any = {
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { slug: { contains: keyword } },
              { short_description: { contains: keyword } },
              {
                users: {
                  full_name: { contains: keyword },
                },
              },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.blogs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      }),
      prisma.blogs.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { message: 'Không thể lấy danh sách blog' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const title = normalizeString(body.title)
    const slug = normalizeString(body.slug)
    const content = normalizeString(body.content)

    const short_description = normalizeString(body.short_description)
    const thumbnail_url = normalizeString(body.thumbnail_url)

    const status = normalizeString(body.status) || 'DRAFT'
    const author_id = Number(body.author_id)

    if (!title)
      return NextResponse.json(
        { message: 'Title là bắt buộc' },
        { status: 400 },
      )

    if (!slug)
      return NextResponse.json({ message: 'Slug là bắt buộc' }, { status: 400 })

    if (!content)
      return NextResponse.json(
        { message: 'Content là bắt buộc' },
        { status: 400 },
      )

    const existSlug = await prisma.blogs.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (existSlug) {
      return NextResponse.json({ message: 'Slug đã tồn tại' }, { status: 400 })
    }

    const created = await prisma.blogs.create({
      data: {
        title,
        slug,
        short_description,
        content,
        thumbnail_url,
        author_id,
        status,
        published_at: status === 'PUBLISHED' ? new Date() : null,
      },
    })

    return NextResponse.json(
      {
        message: 'Tạo blog thành công',
        data: created,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json({ message: 'Không thể tạo blog' }, { status: 500 })
  }
}
