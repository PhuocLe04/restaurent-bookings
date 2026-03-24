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

function toPositiveNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
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

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { searchParams } = new URL(req.url)

    const q = normalizeString(searchParams.get('q'))
    const categoryIdRaw = searchParams.get('category_id')
    const pageRaw = Number(searchParams.get('page') || 1)
    const limitRaw = Number(searchParams.get('limit') || 10)

    const page =
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1

    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.floor(limitRaw), 100)
        : 10

    const skip = (page - 1) * limit

    const category_id =
      categoryIdRaw && Number.isFinite(Number(categoryIdRaw))
        ? Number(categoryIdRaw)
        : null

    const where: any = {
      ...(q
        ? {
            name: {
              contains: q,
            },
          }
        : {}),
      ...(category_id && category_id > 0 ? { category_id } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.menu_items.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
        include: {
          categories: true,
        },
      }),
      prisma.menu_items.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error: any) {
    console.error('GET /api/admin/menu-items error:', error)
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
    let category_id = 0
    let price = NaN
    let image: string | null = null
    let is_available = true
    let imageFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()

      name = normalizeString(form.get('name'))
      category_id = toPositiveNumber(form.get('category_id'))
      price = parsePrice(form.get('price'))
      image = normalizeString(form.get('image')) || null
      is_available = normalizeBoolean(form.get('is_available'), true)

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
      category_id = toPositiveNumber(body.category_id)
      price = parsePrice(body.price)
      image = normalizeString(body.image) || null
      is_available = normalizeBoolean(body.is_available, true)
    }

    if (!name) {
      return NextResponse.json(
        { message: 'Tên món ăn là bắt buộc' },
        { status: 400 },
      )
    }

    if (!category_id) {
      return NextResponse.json(
        { message: 'Danh mục không hợp lệ' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { message: 'Giá món ăn không hợp lệ' },
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

    const category = await prisma.categories.findUnique({
      where: { id: category_id },
    })

    if (!category) {
      return NextResponse.json(
        { message: 'Danh mục không tồn tại' },
        { status: 404 },
      )
    }

    if (category.is_active === false) {
      return NextResponse.json(
        { message: 'Danh mục đang bị ẩn, không thể thêm món ăn' },
        { status: 400 },
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.menu_items.create({
        data: {
          name,
          image,
          category_id,
          price,
          is_available,
        },
        include: {
          categories: true,
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'menu_items',
          entity_id: item.id,
          action: 'INSERT',
          description: `Admin #${access.userId} tạo món ăn #${item.id} - ${item.name}`,
          user_id: access.userId,
        },
      })

      return item
    })

    return NextResponse.json(
      { message: 'Tạo món ăn thành công', item: created },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /api/admin/menu-items error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}
