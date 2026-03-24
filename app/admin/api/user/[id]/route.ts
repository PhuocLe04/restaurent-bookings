import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminOnly } from '@/lib/requireAdminOnly'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const PHONE_REGEX = /^(03[2-9]|05[689]|07[06789]|08[1-689]|09[0-489]|086)\d{7}$/
const NAME_REGEX = /^[a-zA-ZÀ-ỹ\s]+$/u
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]).{6,}$/

function parseId(idRaw: string) {
  const id = Number(idRaw)
  return Number.isFinite(id) && id > 0 ? Math.floor(id) : null
}

// Next mới: params là Promise
type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  const { id: idRaw } = await ctx.params
  const id = parseId(idRaw)
  if (!id) {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
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
            discount_percent: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 },
      )
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('GET /admin/api/user/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Lấy chi tiết người dùng thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  const { id: idRaw } = await ctx.params
  const id = parseId(idRaw)
  if (!id) {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ (JSON lỗi)' },
        { status: 400 },
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        member_point: true,
        membership_id: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 },
      )
    }

    const data: any = {}
    const changedFields: string[] = []

    // ========= full_name =========
    if (body.full_name !== undefined) {
      const full_name = String(body.full_name ?? '').trim()

      if (!full_name) {
        return NextResponse.json(
          { message: 'Họ và tên không được để trống' },
          { status: 400 },
        )
      }

      if (!NAME_REGEX.test(full_name)) {
        return NextResponse.json(
          { message: 'Họ và tên không được chứa số hoặc ký tự đặc biệt' },
          { status: 400 },
        )
      }

      data.full_name = full_name
      changedFields.push('full_name')
    }

    // ========= avatar =========
    if (body.avatar !== undefined) {
      data.avatar = body.avatar == null ? null : String(body.avatar).trim()
      changedFields.push('avatar')
    }

    // ========= email =========
    if (body.email !== undefined) {
      const email = String(body.email ?? '')
        .trim()
        .toLowerCase()

      if (!email) {
        return NextResponse.json(
          { message: 'Email không được để trống' },
          { status: 400 },
        )
      }

      const existedEmail = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
        select: { id: true },
      })

      if (existedEmail) {
        return NextResponse.json(
          { message: 'Email này đã được đăng ký' },
          { status: 409 },
        )
      }

      data.email = email
      changedFields.push('email')
    }

    // ========= phone =========
    if (body.phone !== undefined) {
      const phone = String(body.phone ?? '').trim()

      if (!phone) {
        return NextResponse.json(
          { message: 'Số điện thoại không được để trống' },
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

      const existedPhone = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id },
        },
        select: { id: true },
      })

      if (existedPhone) {
        return NextResponse.json(
          { message: 'Số điện thoại đã tồn tại' },
          { status: 409 },
        )
      }

      data.phone = phone
      changedFields.push('phone')
    }

    // ========= role =========
    if (body.role !== undefined) {
      const role = String(body.role ?? '').trim()

      if (!['admin', 'customer'].includes(role)) {
        return NextResponse.json(
          { message: 'Vai trò không hợp lệ' },
          { status: 400 },
        )
      }

      data.role = role
      changedFields.push('role')
    }

    // ========= password =========
    if (body.password !== undefined) {
      const password = String(body.password ?? '').trim()

      if (!password) {
        return NextResponse.json(
          { message: 'Mật khẩu không được để trống' },
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

      data.password_hash = await bcrypt.hash(password, 10)
      changedFields.push('password')
    }

    // ========= membership / point =========
    const rawMembershipId =
      body.membership_id === undefined || body.membership_id === null
        ? undefined
        : Number(body.membership_id)

    const rawMemberPoint =
      body.member_point === undefined || body.member_point === null
        ? undefined
        : Number(body.member_point)

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

    const hasMembershipId = rawMembershipId !== undefined
    const hasMemberPoint = rawMemberPoint !== undefined

    if (hasMembershipId || hasMemberPoint) {
      const memberships = await prisma.membership.findMany({
        orderBy: { min_point: 'asc' },
        select: {
          id: true,
          min_point: true,
          name: true,
          code: true,
        },
      })

      if (memberships.length === 0) {
        return NextResponse.json(
          { message: 'Không có dữ liệu hạng thành viên' },
          { status: 500 },
        )
      }

      const minMembership = memberships[0]

      let finalMembershipId = existingUser.membership_id ?? minMembership.id
      let finalPoint = Number(existingUser.member_point ?? 0)

      // Ưu tiên membership_id giống route thêm mới
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
      }

      data.membership_id = finalMembershipId
      data.member_point = finalPoint
      changedFields.push('membership_id/member_point')
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: 'Không có dữ liệu nào để cập nhật' },
        { status: 400 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
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
              discount_percent: true,
            },
          },
        },
      })

      await tx.audit_logs.create({
        data: {
          entity: 'users',
          entity_id: user.id,
          action: 'UPDATE',
          description: `Admin #${access.userId} đã cập nhật người dùng #${user.id} (${user.full_name} - ${user.email}). Trường thay đổi: ${changedFields.join(', ')}`,
          user_id: access.userId,
        },
      })

      return user
    })

    return NextResponse.json({
      message: 'Cập nhật người dùng thành công',
      item: updated,
    })
  } catch (error: any) {
    console.error('PATCH /admin/api/user/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Cập nhật người dùng thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const access = await requireAdminOnly()
  if (!access.ok) return access.res

  const { id: idRaw } = await ctx.params
  const id = parseId(idRaw)
  if (!id) {
    return NextResponse.json({ message: 'ID không hợp lệ' }, { status: 400 })
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, full_name: true, email: true },
    })

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 },
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } })

      await tx.audit_logs.create({
        data: {
          entity: 'users',
          entity_id: id,
          action: 'DELETE',
          description: `Admin #${access.userId} đã xóa người dùng #${id} (${existingUser.full_name} - ${existingUser.email})`,
          user_id: access.userId,
        },
      })
    })

    return NextResponse.json({ message: 'Xóa người dùng thành công' })
  } catch (error: any) {
    console.error('DELETE /admin/api/user/[id] error:', error)
    return NextResponse.json(
      {
        message: 'Xóa người dùng thất bại',
        detail: error?.message,
      },
      { status: 500 },
    )
  }
}
