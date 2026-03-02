import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ✅ map folder theo entity trong schema của bạn
const ALLOWED_FOLDERS = {
  avatar: 'avatar', // User.avatar
  blog: 'blog', // blogs.thumbnail_url
  menu: 'menu', // menu_items.image
  service: 'service', // services.image
  combo: 'combo', // (nếu sau này combo có image)
  misc: 'misc',
} as const

type FolderKey = keyof typeof ALLOWED_FOLDERS

function sanitizeFolder(raw: string): FolderKey {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v in ALLOWED_FOLDERS) return v as FolderKey
  return 'misc'
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const folderRaw = formData.get('folder')
    const folder = sanitizeFolder(String(folderRaw ?? 'misc'))

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // ✅ chỉ nhận ảnh
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'Only image files are allowed' },
        { status: 400 },
      )
    }

    // ✅ giới hạn dung lượng (tùy bạn chỉnh)
    const MAX_MB = 5
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { message: `Image must be under ${MAX_MB}MB` },
        { status: 400 },
      )
    }

    // ✅ đọc file -> Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ✅ lấy ext (đảm bảo có đuôi)
    const original = file.name || 'image'
    const ext = path.extname(original) || mimeToExt(file.type) || '.jpg'

    // ✅ tên file duy nhất
    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`

    // ✅ lưu vào public/uploads/<folder>
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, filename)
    await fs.writeFile(filePath, buffer)

    // ✅ URL public để lưu vào DB
    const url = `/uploads/${folder}/${filename}`

    return NextResponse.json({
      url,
      folder,
      filename,
      size: file.size,
      mime: file.type,
    })
  } catch (e: any) {
    return NextResponse.json(
      { message: 'Upload failed', error: e?.message ?? String(e) },
      { status: 500 },
    )
  }
}

function mimeToExt(mime: string) {
  const m = String(mime || '').toLowerCase()
  if (m === 'image/jpeg') return '.jpg'
  if (m === 'image/png') return '.png'
  if (m === 'image/webp') return '.webp'
  if (m === 'image/gif') return '.gif'
  return ''
}
