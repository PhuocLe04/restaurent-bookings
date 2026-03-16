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
    const entity = normalizeString(searchParams.get('entity'))
    const action = normalizeString(searchParams.get('action'))
    const userIdRaw = searchParams.get('user_id')

    const user_id =
      userIdRaw && Number.isFinite(Number(userIdRaw)) ? Number(userIdRaw) : null

    const where: any = {
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {}),
      ...(user_id ? { user_id } : {}),
      ...(keyword
        ? {
            OR: [
              { entity: { contains: keyword } },
              { action: { contains: keyword } },
              { description: { contains: keyword } },
              {
                users: {
                  full_name: { contains: keyword },
                },
              },
              {
                users: {
                  email: { contains: keyword },
                },
              },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.audit_logs.findMany({
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
              phone: true,
              role: true,
            },
          },
        },
      }),
      prisma.audit_logs.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /admin/api/audit-logs error:', error)
    return NextResponse.json(
      { message: 'Không thể lấy danh sách nhật ký hệ thống' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const entity = normalizeString(body?.entity)
    const action = normalizeString(body?.action)
    const description = normalizeString(body?.description)
    const entity_id =
      body?.entity_id === null ||
      body?.entity_id === undefined ||
      body?.entity_id === ''
        ? null
        : Number(body.entity_id)
    const user_id = Number(body?.user_id)

    if (!entity) {
      return NextResponse.json(
        { message: 'entity là bắt buộc' },
        { status: 400 },
      )
    }

    if (!action) {
      return NextResponse.json(
        { message: 'action là bắt buộc' },
        { status: 400 },
      )
    }

    if (!description) {
      return NextResponse.json(
        { message: 'description là bắt buộc' },
        { status: 400 },
      )
    }

    if (description.length > 500) {
      return NextResponse.json(
        { message: 'description không được vượt quá 500 ký tự' },
        { status: 400 },
      )
    }

    if (entity_id !== null && (!Number.isFinite(entity_id) || entity_id <= 0)) {
      return NextResponse.json(
        { message: 'entity_id không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json(
        { message: 'user_id không hợp lệ' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy user' },
        { status: 404 },
      )
    }

    const created = await prisma.audit_logs.create({
      data: {
        entity,
        entity_id,
        action,
        description,
        user_id,
      },
      include: {
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Tạo audit log thành công',
        data: created,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /admin/api/audit-logs error:', error)
    return NextResponse.json(
      { message: 'Không thể tạo audit log' },
      { status: 500 },
    )
  }
}
