import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

const BLOG_FILTER_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
const BLOG_CREATE_STATUSES = ['DRAFT', 'PUBLISHED'] as const

function toInt(v: string | null, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const url = new URL(req.url)

    const page = toInt(url.searchParams.get('page'), 1)
    const limit = Math.min(toInt(url.searchParams.get('limit'), 20), 50)

    const search = (url.searchParams.get('search') ?? '').trim()
    const q = (url.searchParams.get('q') ?? '').trim()
    const keyword = (search || q).trim()

    const status = (url.searchParams.get('status') ?? '').trim().toUpperCase()

    const where: any = {}

    if (status) {
      if (
        !BLOG_FILTER_STATUSES.includes(
          status as (typeof BLOG_FILTER_STATUSES)[number],
        )
      ) {
        return NextResponse.json(
          { message: 'Trạng thái lọc không hợp lệ' },
          { status: 400 },
        )
      }

      where.status = status
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { slug: { contains: keyword } },
        { short_description: { contains: keyword } },
        { content: { contains: keyword } },
        {
          users: {
            full_name: { contains: keyword },
          },
        },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.blogs.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
      totalPages: Math.max(1, Math.ceil(total / limit)),
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
    })
  } catch (error: any) {
    console.error('GET /admin/api/blog error:', error)
    return NextResponse.json(
      {
        message: 'Lấy danh sách blog thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ (JSON lỗi)' },
        { status: 400 },
      )
    }

    const title = normalizeString(body.title)
    const slug = normalizeString(body.slug)
    const content = normalizeString(body.content)
    const short_description = normalizeString(body.short_description)
    const thumbnail_url = normalizeString(body.thumbnail_url)
    const status = normalizeString(body.status || 'DRAFT').toUpperCase()

    if (!title || !slug || !content) {
      return NextResponse.json(
        {
          message: 'Thiếu thông tin bắt buộc: title, slug, content',
        },
        { status: 400 },
      )
    }

    if (
      !BLOG_CREATE_STATUSES.includes(
        status as (typeof BLOG_CREATE_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { message: 'Trạng thái không hợp lệ' },
        { status: 400 },
      )
    }

    const existedSlug = await prisma.blogs.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (existedSlug) {
      return NextResponse.json({ message: 'Slug đã tồn tại' }, { status: 409 })
    }

    const created = await prisma.$transaction(async (tx) => {
      const blog = await tx.blogs.create({
        data: {
          title,
          slug,
          content,
          short_description: short_description || null,
          thumbnail_url: thumbnail_url || null,
          author_id: access.userId,
          status,
          published_at: status === 'PUBLISHED' ? new Date() : null,
        },
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'blogs',
          entity_id: blog.id,
          action: 'INSERT',
          description: `Admin #${access.userId} đã tạo blog #${blog.id} (${blog.title})`,
          user_id: access.userId,
        },
      })

      return blog
    })

    return NextResponse.json(
      {
        message: 'Tạo blog thành công',
        item: created,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /admin/api/blog error:', error)
    return NextResponse.json(
      {
        message: 'Tạo blog thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
