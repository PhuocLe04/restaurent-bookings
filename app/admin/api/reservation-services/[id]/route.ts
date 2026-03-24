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

function getIdFromUrl(req: Request) {
  const pathname = new URL(req.url).pathname
  const idText = pathname.split('/').pop() || ''
  const id = Number(idText)

  return Number.isFinite(id) && id > 0 ? id : NaN
}

export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.services.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy dịch vụ' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('GET /api/admin/services/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const existing = await prisma.services.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: 'Không tìm thấy dịch vụ' },
        { status: 404 },
      )
    }

    const contentType = req.headers.get('content-type') || ''

    let name = existing.name
    let image = existing.image
    let description = existing.description
    let price = Number(existing.price)
    let is_active = existing.is_active
    let imageFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()

      const rawName = form.get('name')
      const rawImage = form.get('image')
      const rawDescription = form.get('description')
      const rawPrice = form.get('price')
      const rawIsActive = form.get('is_active')
      const rawFile = form.get('image_file')

      if (rawName !== null) name = normalizeString(rawName) || existing.name
      if (rawImage !== null) image = normalizeString(rawImage) || null
      if (rawDescription !== null) {
        description = normalizeString(rawDescription) || null
      }
      if (rawPrice !== null) {
        price = parsePrice(rawPrice)
      }
      if (rawIsActive !== null) {
        is_active = normalizeBoolean(rawIsActive, existing.is_active)
      }

      imageFile = rawFile instanceof File && rawFile.size > 0 ? rawFile : null
    } else {
      const body = await req.json().catch(() => null)

      if (!body) {
        return NextResponse.json(
          { message: 'Dữ liệu không hợp lệ' },
          { status: 400 },
        )
      }

      if ('name' in body) name = normalizeString(body.name) || existing.name
      if ('image' in body) image = normalizeString(body.image) || null
      if ('description' in body) {
        description = normalizeString(body.description) || null
      }
      if ('price' in body) {
        price = parsePrice(body.price)
      }
      if ('is_active' in body) {
        is_active = normalizeBoolean(body.is_active, existing.is_active)
      }
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

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.services.update({
        where: { id },
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
          action: 'UPDATE',
          description:
            `Admin #${access.userId} cập nhật dịch vụ #${item.id}. ` +
            `Trước: name=${existing.name}, price=${existing.price}, is_active=${existing.is_active}. ` +
            `Sau: name=${item.name}, price=${item.price}, is_active=${item.is_active}`,
          user_id: access.userId,
        },
      })

      return item
    })

    return NextResponse.json({
      message: 'Cập nhật dịch vụ thành công',
      item: updated,
    })
  } catch (error: any) {
    console.error('PUT /api/admin/services/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const id = getIdFromUrl(req)

    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const existing = await prisma.services.findUnique({
      where: { id },
      include: {
        combo_services: true,
        reservation_services: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { message: 'Không tìm thấy dịch vụ' },
        { status: 404 },
      )
    }

    if (
      existing.combo_services.length > 0 ||
      existing.reservation_services.length > 0
    ) {
      return NextResponse.json(
        {
          message:
            'Không thể xóa dịch vụ vì đã được sử dụng trong combo hoặc reservation',
        },
        { status: 400 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.services.delete({
        where: { id },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'services',
          entity_id: existing.id,
          action: 'DELETE',
          description: `Admin #${access.userId} xóa dịch vụ #${existing.id} - ${existing.name}`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({
      message: 'Xóa dịch vụ thành công',
    })
  } catch (error: any) {
    console.error('DELETE /api/admin/services/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}
