import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function normalizeBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === '1') return true
    if (v === 'false' || v === '0') return false
  }

  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }

  return fallback
}

function parsePrice(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d]/g, '')
    if (!cleaned) return NaN
    return Number(cleaned)
  }

  return NaN
}

function isValidImagePath(value: string) {
  if (!value) return true

  return (
    value.startsWith('/uploads/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  )
}

function getSafeExtension(fileName: string, mimeType: string) {
  const ext = path.extname(fileName || '').toLowerCase()
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

  if (allowedExt.includes(ext)) return ext

  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'

  return ''
}

async function saveUploadedImage(file: File) {
  if (!file || file.size <= 0) {
    throw new Error('File ảnh không hợp lệ')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Chỉ chấp nhận file ảnh')
  }

  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Ảnh tối đa 5MB')
  }

  const ext = getSafeExtension(file.name, file.type)
  if (!ext) {
    throw new Error('Định dạng ảnh không được hỗ trợ')
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'misc')
  await mkdir(uploadDir, { recursive: true })

  const fileName = `${Date.now()}-${randomUUID()}${ext}`
  const filePath = path.join(uploadDir, fileName)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await writeFile(filePath, buffer)

  return `/uploads/misc/${fileName}`
}

function parseIsActiveFilter(value: string | null) {
  if (!value) return undefined
  const v = value.trim().toLowerCase()

  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false

  return undefined
}

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { searchParams } = new URL(req.url)

    const q = normalizeString(searchParams.get('q'))
    const isActive = parseIsActiveFilter(searchParams.get('is_active'))

    const pageRaw = Number(searchParams.get('page') || 1)
    const limitRaw = Number(searchParams.get('limit') || 10)

    const page =
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.floor(limitRaw), 100)
        : 10

    const skip = (page - 1) * limit

    const where = {
      ...(q
        ? {
            name: {
              contains: q,
            },
          }
        : {}),
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.services.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      prisma.services.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error: any) {
    console.error('GET /api/admin/services error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const contentType = req.headers.get('content-type') || ''

    let name = ''
    let image: string | null = null
    let description: string | null = null
    let price = NaN
    let is_active = true
    let imageFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()

      name = normalizeString(form.get('name'))
      image = normalizeString(form.get('image')) || null
      description = normalizeString(form.get('description')) || null
      price = parsePrice(form.get('price'))

      // cho phép chọn true / false khi create
      is_active = normalizeBoolean(form.get('is_active'), true)

      const rawFile = form.get('image_file')
      imageFile = rawFile instanceof File && rawFile.size > 0 ? rawFile : null
    } else {
      const body = await req.json().catch(() => null)

      if (!body) {
        return NextResponse.json(
          { message: 'Dữ liệu không hợp lệ' },
          { status: 400 },
        )
      }

      name = normalizeString(body.name)
      image = normalizeString(body.image) || null
      description = normalizeString(body.description) || null
      price = parsePrice(body.price)

      // cho phép chọn true / false khi create
      is_active = normalizeBoolean(body.is_active, true)
    }

    if (!name) {
      return NextResponse.json(
        { message: 'Tên dịch vụ là bắt buộc' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { message: 'Giá dịch vụ không hợp lệ' },
        { status: 400 },
      )
    }

    if (imageFile) {
      image = await saveUploadedImage(imageFile)
    } else if (image) {
      if (!isValidImagePath(image)) {
        return NextResponse.json(
          {
            message:
              'Ảnh không hợp lệ. Chỉ chấp nhận link http/https hoặc đường dẫn /uploads/...',
          },
          { status: 400 },
        )
      }

      if (image.length > 500) {
        return NextResponse.json(
          { message: 'Đường dẫn ảnh quá dài, tối đa 500 ký tự' },
          { status: 400 },
        )
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.services.create({
        data: {
          name,
          image,
          description,
          price,
          is_active,
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'services',
          entity_id: item.id,
          action: 'INSERT',
          description: `Admin #${access.userId} tạo dịch vụ #${item.id} - ${item.name} (is_active=${item.is_active})`,
          user_id: access.userId,
        },
      })

      return item
    })

    return NextResponse.json(
      { message: 'Tạo dịch vụ thành công', item: created },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /api/admin/services error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}
