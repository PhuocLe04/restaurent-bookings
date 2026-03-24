import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const PHONE_REGEX = /^(03[2-9]|05[689]|07[06789]|08[1-689]|09[0-489]|086)\d{7}$/
const NAME_REGEX = /^[a-zA-ZÀ-ỹ\s]+$/u
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]).{6,}$/

function toInt(v: string | null, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function toOptionalInt(v: string | null) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

function toBool(v: string | null, fallback = false) {
  if (v == null || v === '') return fallback
  const value = v.trim().toLowerCase()
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return fallback
}

/**
 * GET /admin/api/user?page=1&limit=20&search=...&role=admin|customer&membership_id=1&available_only=true
 * (fallback) q=... cũng chạy
 *
 * available_only=true:
 * - chỉ lấy những user chưa tồn tại trong bảng staff
 */
export async function GET(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const url = new URL(req.url)

    const page = toInt(url.searchParams.get('page'), 1)
    const limit = Math.min(toInt(url.searchParams.get('limit'), 20), 50)

    const search = (url.searchParams.get('search') ?? '').trim()
    const q = (url.searchParams.get('q') ?? '').trim()
    const keyword = (search || q).trim()

    const role = (url.searchParams.get('role') ?? '').trim()
    const membership_id = toOptionalInt(url.searchParams.get('membership_id'))
    const availableOnly = toBool(url.searchParams.get('available_only'), false)

    const where: any = {}

    if (role) where.role = role
    if (membership_id) where.membership_id = membership_id

    if (keyword) {
      where.OR = [
        { full_name: { contains: keyword } },
        { email: { contains: keyword } },
        { phone: { contains: keyword } },
      ]
    }

    if (availableOnly) {
      const existedStaff = await prisma.staff.findMany({
        select: { user_id: true },
      })

      const usedUserIds = existedStaff
        .map((item) => item.user_id)
        .filter((id): id is number => typeof id === 'number')

      where.id = {
        notIn: usedUserIds.length > 0 ? usedUserIds : [-1],
      }
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          full_name: true,
          avatar: true,
          email: true,
          phone: true,
          role: true,
          member_point: true,
          membership_id: true,
          created_at: true,
          membership: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      access: {
        userId: access.userId,
        isAdmin: access.isAdmin,
        isStaff: access.isStaff,
      },
    })
  } catch (error: any) {
    console.error('GET /admin/api/user error:', error)
    return NextResponse.json(
      {
        message: 'Lấy danh sách người dùng thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

/**
 * POST /admin/api/user
 * body: { full_name, email, phone, password, role?, avatar?, membership_id?, member_point? }
 *
 * RULE:
 * - Nếu có membership_id => gán member_point = min_point của membership đó
 * - Else nếu có member_point => suy membership_id theo min_point <= point lớn nhất
 * - Else => default membership_id = 1 (nếu có), và point = min_point của nó
 *
 * VALIDATION:
 * - Giống route register:
 *   + Họ tên chỉ gồm chữ và khoảng trắng
 *   + SĐT đúng định dạng Việt Nam
 *   + Mật khẩu >= 6 ký tự, có hoa/thường/số/ký tự đặc biệt
 *
 * AUDIT LOG:
 * - Ghi nhận log khi admin tạo user thành công
 */
export async function POST(req: Request) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ (JSON lỗi)' },
        { status: 400 },
      )
    }

    const full_name = String(body.full_name ?? '').trim()
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const phone = String(body.phone ?? '').trim()
    const password = String(body.password ?? '').trim()

    const role = String(body.role ?? 'customer').trim()
    const avatar = body.avatar == null ? null : String(body.avatar).trim()

    const rawMembershipId =
      body.membership_id === undefined || body.membership_id === null
        ? undefined
        : Number(body.membership_id)

    const rawMemberPoint =
      body.member_point === undefined || body.member_point === null
        ? undefined
        : Number(body.member_point)

    if (!full_name || !email || !phone || !password) {
      return NextResponse.json(
        {
          message:
            'Thiếu thông tin bắt buộc: full_name, email, phone, password',
        },
        { status: 400 },
      )
    }

    if (!NAME_REGEX.test(full_name)) {
      return NextResponse.json(
        { message: 'Họ và tên không được chứa số hoặc ký tự đặc biệt' },
        { status: 400 },
      )
    }

    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        {
          message:
            'Số điện thoại không hợp lệ (đầu số phải bắt đầu từ 03, 05, 07, 08, 09, 086)',
        },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 },
      )
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          message:
            'Mật khẩu phải bao gồm chữ in hoa, chữ thường, số và ký tự đặc biệt',
        },
        { status: 400 },
      )
    }

    if (!['admin', 'customer'].includes(role)) {
      return NextResponse.json(
        { message: 'Vai trò không hợp lệ' },
        { status: 400 },
      )
    }

    if (rawMembershipId !== undefined) {
      if (!Number.isFinite(rawMembershipId) || rawMembershipId <= 0) {
        return NextResponse.json(
          { message: 'membership_id không hợp lệ' },
          { status: 400 },
        )
      }
    }

    if (rawMemberPoint !== undefined) {
      if (!Number.isFinite(rawMemberPoint) || rawMemberPoint < 0) {
        return NextResponse.json(
          { message: 'member_point không hợp lệ' },
          { status: 400 },
        )
      }
    }

    const existedEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existedEmail) {
      return NextResponse.json(
        { message: 'Email này đã được đăng ký' },
        { status: 409 },
      )
    }

    const existedPhone = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    })

    if (existedPhone) {
      return NextResponse.json(
        { message: 'Số điện thoại đã tồn tại' },
        { status: 409 },
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const memberships = await tx.membership.findMany({
        orderBy: { min_point: 'asc' },
        select: {
          id: true,
          min_point: true,
          name: true,
          code: true,
        },
      })

      if (memberships.length === 0) {
        throw new Error('No membership data found')
      }

      const minMembership = memberships[0]
      const defaultMembership =
        memberships.find((m) => m.id === 1) ?? minMembership

      let finalMembershipId = defaultMembership.id
      let finalPoint = Number(defaultMembership.min_point ?? 0)

      const hasMembershipId = rawMembershipId !== undefined
      const hasMemberPoint = rawMemberPoint !== undefined

      if (hasMembershipId) {
        const mem = memberships.find((m) => m.id === rawMembershipId)
        if (!mem) {
          return NextResponse.json(
            { message: 'Không tìm thấy hạng thành viên' },
            { status: 404 },
          )
        }

        finalMembershipId = mem.id
        finalPoint = Number(mem.min_point ?? 0)
      } else if (hasMemberPoint) {
        finalPoint = rawMemberPoint!

        let chosen = minMembership
        for (const m of memberships) {
          const mp = Number(m.min_point ?? 0)
          if (mp <= finalPoint) chosen = m
          else break
        }

        finalMembershipId = chosen.id
      } else {
        finalMembershipId = defaultMembership.id
        finalPoint = Number(defaultMembership.min_point ?? 0)
      }

      const password_hash = await bcrypt.hash(password, 10)

      const user = await tx.user.create({
        data: {
          full_name,
          email,
          phone,
          password_hash,
          role,
          avatar,
          membership_id: finalMembershipId,
          member_point: finalPoint,
        },
        select: {
          id: true,
          full_name: true,
          avatar: true,
          email: true,
          phone: true,
          role: true,
          member_point: true,
          membership_id: true,
          created_at: true,
          membership: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'users',
          entity_id: user.id,
          action: 'INSERT',
          description: `Admin #${access.userId} đã tạo người dùng #${user.id} (${user.full_name} - ${user.email}) với vai trò ${user.role}`,
          user_id: access.userId,
        },
      })

      return user
    })

    if (created instanceof NextResponse) return created

    return NextResponse.json(
      {
        message: 'Tạo người dùng thành công',
        item: created,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error('POST /admin/api/user error:', error)
    return NextResponse.json(
      {
        message: 'Tạo người dùng thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
