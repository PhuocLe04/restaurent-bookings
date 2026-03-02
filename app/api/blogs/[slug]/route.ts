import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ message: 'Invalid slug' }, { status: 400 })
    }

    const blog = await prisma.blogs.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        short_description: true,
        thumbnail_url: true,
        status: true,
        published_at: true,
        created_at: true,
        updated_at: true,
        users: { select: { id: true, full_name: true, avatar: true } },
      },
    })

    if (!blog)
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (blog.status !== 'PUBLISHED')
      return NextResponse.json({ message: 'Not published' }, { status: 403 })

    return NextResponse.json({
      ...blog,
      author: blog.users
        ? {
            id: blog.users.id,
            full_name: blog.users.full_name,
            avatar: blog.users.avatar,
          }
        : null,
      users: undefined,
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Server error', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}
