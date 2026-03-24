import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

const BLOG_STATUSES = ['ARCHIVED', 'DRAFT', 'PUBLISHED'] as const

function parseId(idValue: string) {
  const id = Number(idValue)
  return Number.isFinite(id) && id > 0 ? Math.floor(id) : null
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id: rawId } = await params
    const id = parseId(rawId)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.blogs.findUnique({
      where: { id },
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

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy blog' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      item,
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
    })
  } catch (error: any) {
    console.error('GET /admin/api/blogs/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Không thể lấy blog',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id: rawId } = await params
    const id = parseId(rawId)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

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
    const status = normalizeString(body.status).toUpperCase()

    if (!title || !slug || !content) {
      return NextResponse.json(
        { message: 'Thiếu thông tin bắt buộc: title, slug, content' },
        { status: 400 },
      )
    }

    if (!BLOG_STATUSES.includes(status as (typeof BLOG_STATUSES)[number])) {
      return NextResponse.json(
        { message: 'Trạng thái không hợp lệ' },
        { status: 400 },
      )
    }

    const exist = await prisma.blogs.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        published_at: true,
      },
    })

    if (!exist) {
      return NextResponse.json(
        { message: 'Không tìm thấy blog' },
        { status: 404 },
      )
    }

    const existedSlug = await prisma.blogs.findFirst({
      where: {
        slug,
        NOT: { id },
      },
      select: { id: true },
    })

    if (existedSlug) {
      return NextResponse.json({ message: 'Slug đã tồn tại' }, { status: 409 })
    }

    let publishedAt: Date | null = exist.published_at ?? null

    if (status === 'PUBLISHED') {
      publishedAt = exist.published_at ?? new Date()
    } else if (status === 'DRAFT') {
      publishedAt = null
    } else if (status === 'ARCHIVED') {
      publishedAt = exist.published_at ?? null
    }

    const updated = await prisma.$transaction(async (tx) => {
      const blog = await tx.blogs.update({
        where: { id },
        data: {
          title,
          slug,
          content,
          short_description: short_description || null,
          thumbnail_url: thumbnail_url || null,
          status,
          updated_at: new Date(),
          published_at: publishedAt,
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
          action: 'UPDATE',
          description: `Admin #${access.userId} đã cập nhật blog #${blog.id} (${blog.title})`,
          user_id: access.userId,
        },
      })

      return blog
    })

    return NextResponse.json({
      message: 'Cập nhật blog thành công',
      item: updated,
    })
  } catch (error: any) {
    console.error('PUT /admin/api/blogs/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Không thể cập nhật blog',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id: rawId } = await params
    const id = parseId(rawId)

    if (!id) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const exist = await prisma.blogs.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    })

    if (!exist) {
      return NextResponse.json(
        { message: 'Không tìm thấy blog' },
        { status: 404 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.audit_logs.create({
        data: {
          entity: 'blogs',
          entity_id: exist.id,
          action: 'DELETE',
          description: `Admin #${access.userId} đã xoá blog #${exist.id} (${exist.title})`,
          user_id: access.userId,
        },
      })

      await tx.blogs.delete({
        where: { id: exist.id },
      })
    })

    return NextResponse.json({
      message: 'Xoá blog thành công',
    })
  } catch (error: any) {
    console.error('DELETE /admin/api/blogs/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Không thể xoá blog',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
