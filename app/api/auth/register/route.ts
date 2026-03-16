import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const PHONE_REGEX = /^(03[2-9]|05[689]|07[06789]|08[1-689]|09[0-489]|086)\d{7}$/
const NAME_REGEX = /^[a-zA-ZÀ-ỹ\s]+$/u
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]).{6,}$/
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Dữ liệu gửi lên không hợp lệ (JSON lỗi)' },
        { status: 400 },
      )
    }

    const { full_name, phone, email, password } = body as {
      full_name?: string
      phone?: string
      email?: string
      password?: string
    }

    // 1) Kiểm tra dữ liệu bắt buộc
    if (!full_name || !phone || !email || !password) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin' },
        { status: 400 },
      )
    }

    const fullNameTrimmed = full_name.trim()
    const emailNormalized = email.trim().toLowerCase()
    const phoneTrimmed = phone.trim()

    // 2) Kiểm tra họ tên
    if (!NAME_REGEX.test(fullNameTrimmed)) {
      return NextResponse.json(
        { message: 'Họ và tên không được chứa số hoặc ký tự đặc biệt' },
        { status: 400 },
      )
    }

    // 3) Kiểm tra số điện thoại Việt Nam
    if (!PHONE_REGEX.test(phoneTrimmed)) {
      return NextResponse.json(
        {
          message:
            'Số điện thoại không hợp lệ (đầu số phải bắt đầu từ 03, 07,....)',
        },
        { status: 400 },
      )
    }

    // 4) Kiểm tra mật khẩu
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

    // 5) Kiểm tra email đã tồn tại
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email này đã được đăng ký' },
        { status: 409 },
      )
    }

    // 6) Mã hóa mật khẩu
    const password_hash = await bcrypt.hash(password, 10)

    // 7) Tạo tài khoản
    const user = await prisma.user.create({
      data: {
        full_name: fullNameTrimmed,
        phone: phoneTrimmed,
        email: emailNormalized,
        password_hash,
        role: 'customer',
      },
    })

    // 8) Trả kết quả
    return NextResponse.json(
      {
        message: 'Đăng ký tài khoản thành công',
        user: {
          id: user.id,
          full_name: user.full_name,
          phone: user.phone,
          email: user.email,
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('Register error:', err)

    return NextResponse.json(
      { message: 'Đã xảy ra lỗi trong quá trình đăng ký' },
      { status: 500 },
    )
  }
}
