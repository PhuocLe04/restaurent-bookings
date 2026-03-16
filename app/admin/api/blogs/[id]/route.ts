import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseId(params: { id: string }) {
  const id = Number(params.id)
  return Number.isFinite(id) && id > 0 ? id : null
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)

    if (!id)
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })

    const data = await prisma.blogs.findUnique({
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

    if (!data)
      return NextResponse.json(
        { message: 'Không tìm thấy blog' },
        { status: 404 },
      )

    return NextResponse.json({ data })
  } catch (error) {
    console.error(error)

    return NextResponse.json({ message: 'Không thể lấy blog' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)

    if (!id)
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })

    const body = await req.json()

    const title = normalizeString(body.title)
    const slug = normalizeString(body.slug)
    const content = normalizeString(body.content)

    const short_description = normalizeString(body.short_description)
    const thumbnail_url = normalizeString(body.thumbnail_url)
    const status = normalizeString(body.status)

    const exist = await prisma.blogs.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!exist)
      return NextResponse.json(
        { message: 'Không tìm thấy blog' },
        { status: 404 },
      )

    const updated = await prisma.blogs.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        short_description,
        thumbnail_url,
        status,
        updated_at: new Date(),
        published_at: status === 'PUBLISHED' ? new Date() : null,
      },
    })

    return NextResponse.json({
      message: 'Cập nhật blog thành công',
      data: updated,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { message: 'Không thể cập nhật blog' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseId(params)

    if (!id)
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })

    const exist = await prisma.blogs.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!exist)
      return NextResponse.json(
        { message: 'Không tìm thấy blog' },
        { status: 404 },
      )

    await prisma.blogs.delete({
      where: { id },
    })

    return NextResponse.json({
      message: 'Xoá blog thành công',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({ message: 'Không thể xoá blog' }, { status: 500 })
  }
}
