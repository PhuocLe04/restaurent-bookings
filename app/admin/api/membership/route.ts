import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'

export const dynamic = 'force-dynamic'

// GET /admin/api/membership?page=&limit=&search=
export async function GET(req: Request) {
  const auth = await requireAdminOnly()
  if (!auth.ok) return auth.res

  try {
    const url = new URL(req.url)
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20),
    )
    const tuKhoa = (url.searchParams.get('search') ?? '').trim()

    const where = tuKhoa
      ? {
          OR: [
            { name: { contains: tuKhoa, mode: 'insensitive' as const } },
            { code: { contains: tuKhoa, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [tongSoLuong, danhSachRaw] = await Promise.all([
      prisma.membership.count({ where }),
      prisma.membership.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          code: true,
          name: true,
          min_point: true,
          discount_percent: true,
          created_at: true,
          _count: { select: { users: true } },
        },
      }),
    ])

    const danhSach = danhSachRaw.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      min_point: item.min_point,
      discount_percent: item.discount_percent,
      created_at: item.created_at,
      soLuongNguoiDung: item._count.users,
    }))

    return NextResponse.json({
      items: danhSach,
      total: tongSoLuong,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(tongSoLuong / limit)),
    })
  } catch (error) {
    console.error('Lỗi GET /admin/api/membership:', error)
    return NextResponse.json({ message: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

// POST /admin/api/membership
// Tạo mới hạng thành viên + ghi audit log
export async function POST(req: Request) {
  const auth = await requireAdminOnly()
  if (!auth.ok) return auth.res

  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ' },
        { status: 400 },
      )
    }

    const maHang = String(body.code ?? '').trim()
    const tenHang = String(body.name ?? '').trim()
    const diemToiThieu = Number(body.min_point ?? 0)
    const phanTramGiam = Number(body.discount_percent ?? 0)

    if (!maHang) {
      return NextResponse.json(
        { message: 'Mã hạng là bắt buộc' },
        { status: 400 },
      )
    }

    if (!tenHang) {
      return NextResponse.json(
        { message: 'Tên hạng là bắt buộc' },
        { status: 400 },
      )
    }

    if (!Number.isFinite(diemToiThieu) || diemToiThieu < 0) {
      return NextResponse.json(
        { message: 'Điểm tối thiểu không hợp lệ' },
        { status: 400 },
      )
    }

    if (
      !Number.isFinite(phanTramGiam) ||
      phanTramGiam < 0 ||
      phanTramGiam > 100
    ) {
      return NextResponse.json(
        { message: 'Phần trăm giảm phải nằm trong khoảng từ 0 đến 100' },
        { status: 400 },
      )
    }

    const hangDaTonTai = await prisma.membership.findUnique({
      where: { code: maHang },
      select: { id: true },
    })

    if (hangDaTonTai) {
      return NextResponse.json(
        { message: 'Mã hạng đã tồn tại' },
        { status: 409 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const hangThanhVienMoi = await tx.membership.create({
        data: {
          code: maHang,
          name: tenHang,
          min_point: diemToiThieu,
          discount_percent: Math.floor(phanTramGiam),
        },
        select: {
          id: true,
          code: true,
          name: true,
          min_point: true,
          discount_percent: true,
          created_at: true,
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'membership',
          entity_id: hangThanhVienMoi.id,
          action: 'INSERT',
          description: `Tạo mới hạng thành viên: ${hangThanhVienMoi.name} (${hangThanhVienMoi.code}), điểm tối thiểu ${hangThanhVienMoi.min_point}, giảm ${hangThanhVienMoi.discount_percent}%`,
          user_id: auth.userId,
        },
      })

      return hangThanhVienMoi
    })

    return NextResponse.json(
      {
        message: 'Tạo mới hạng thành viên thành công',
        data: result,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Lỗi POST /admin/api/membership:', error)
    return NextResponse.json({ message: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
