import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function parseId(id: string) {
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id } = await params
    const menuItemId = parseId(id)

    if (!menuItemId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const item = await prisma.menu_items.findUnique({
      where: { id: menuItemId },
      include: {
        categories: true,
        combo_menu_items: true,
        order_items: true,
      },
    })

    if (!item) {
      return NextResponse.json(
        { message: 'Không tìm thấy món ăn' },
        { status: 404 },
      )
    }

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('GET /api/admin/menu-items/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const { id } = await params
    const menuItemId = parseId(id)

    if (!menuItemId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const current = await prisma.menu_items.findUnique({
      where: { id: menuItemId },
      include: {
        categories: true,
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy món ăn' },
        { status: 404 },
      )
    }

    const contentType = req.headers.get('content-type') || ''
    const data: Record<string, unknown> = {}

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()

      if (form.has('name')) {
        const name = normalizeString(form.get('name'))
        if (!name) {
          return NextResponse.json(
            { message: 'Tên món ăn không được để trống' },
            { status: 400 },
          )
        }
        data.name = name
      }

      if (form.has('image')) {
        const image = normalizeString(form.get('image'))
        if (image) {
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

          data.image = image
        } else {
          data.image = null
        }
      }

      const rawFile = form.get('image_file')
      const imageFile =
        rawFile instanceof File && rawFile.size > 0 ? rawFile : null

      if (imageFile) {
        data.image = await saveUploadedImage(imageFile)
      }

      if (form.has('category_id')) {
        const category_id = toPositiveNumber(form.get('category_id'))

        if (!category_id) {
          return NextResponse.json(
            { message: 'Danh mục không hợp lệ' },
            { status: 400 },
          )
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
            {
              message: 'Danh mục đang bị ẩn, không thể cập nhật món ăn vào đây',
            },
            { status: 400 },
          )
        }

        data.category_id = category_id
      }

      if (form.has('price')) {
        const price = parsePrice(form.get('price'))

        if (!Number.isFinite(price) || price < 0) {
          return NextResponse.json(
            { message: 'Giá món ăn không hợp lệ' },
            { status: 400 },
          )
        }

        data.price = price
      }

      if (form.has('is_available')) {
        data.is_available = normalizeBoolean(form.get('is_available'), true)
      }
    } else {
      const body = await req.json().catch(() => null)

      if (!body) {
        return NextResponse.json(
          { message: 'Dữ liệu không hợp lệ' },
          { status: 400 },
        )
      }

      if (body.name !== undefined) {
        const name = normalizeString(body.name)
        if (!name) {
          return NextResponse.json(
            { message: 'Tên món ăn không được để trống' },
            { status: 400 },
          )
        }
        data.name = name
      }

      if (body.image !== undefined) {
        const image = normalizeString(body.image)
        if (image) {
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

          data.image = image
        } else {
          data.image = null
        }
      }

      if (body.category_id !== undefined) {
        const category_id = toPositiveNumber(body.category_id)

        if (!category_id) {
          return NextResponse.json(
            { message: 'Danh mục không hợp lệ' },
            { status: 400 },
          )
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
            {
              message: 'Danh mục đang bị ẩn, không thể cập nhật món ăn vào đây',
            },
            { status: 400 },
          )
        }

        data.category_id = category_id
      }

      if (body.price !== undefined) {
        const price = parsePrice(body.price)

        if (!Number.isFinite(price) || price < 0) {
          return NextResponse.json(
            { message: 'Giá món ăn không hợp lệ' },
            { status: 400 },
          )
        }

        data.price = price
      }

      if (body.is_available !== undefined) {
        data.is_available = normalizeBoolean(body.is_available, true)
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Không có dữ liệu để cập nhật' },
        { status: 400 },
      )
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.menu_items.update({
        where: { id: menuItemId },
        data,
        include: {
          categories: true,
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'menu_items',
          entity_id: updated.id,
          action: 'UPDATE',
          description:
            `Admin #${access.userId} cập nhật món ăn #${updated.id} - ${updated.name}` +
            ` | name: "${current.name}" -> "${updated.name}"` +
            ` | image: "${current.image || ''}" -> "${updated.image || ''}"` +
            ` | category_id: ${current.category_id} -> ${updated.category_id}` +
            ` | price: ${current.price} -> ${updated.price}` +
            ` | is_available: ${current.is_available} -> ${updated.is_available}`,
          user_id: access.userId,
        },
      })

      return updated
    })

    return NextResponse.json({
      message: 'Cập nhật món ăn thành công',
      item,
    })
  } catch (error: any) {
    console.error('PATCH /api/admin/menu-items/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
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
    const { id } = await params
    const menuItemId = parseId(id)

    if (!menuItemId) {
      return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
    }

    const current = await prisma.menu_items.findUnique({
      where: { id: menuItemId },
      include: {
        _count: {
          select: {
            combo_menu_items: true,
            order_items: true,
          },
        },
        categories: true,
      },
    })

    if (!current) {
      return NextResponse.json(
        { message: 'Không tìm thấy món ăn' },
        { status: 404 },
      )
    }

    if (current._count.combo_menu_items > 0 || current._count.order_items > 0) {
      return NextResponse.json(
        {
          message: 'Không thể xóa món ăn vì đang được sử dụng ở dữ liệu khác',
        },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.menu_items.delete({
        where: { id: menuItemId },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'menu_items',
          entity_id: menuItemId,
          action: 'DELETE',
          description: `Admin #${access.userId} xóa món ăn #${menuItemId} - ${current.name}`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({ message: 'Xóa món ăn thành công' })
  } catch (error: any) {
    console.error('DELETE /api/admin/menu-items/[id] error:', error)
    return NextResponse.json(
      { message: 'Lỗi server', detail: error?.message },
      { status: 500 },
    )
  }
}
