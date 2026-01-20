import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Phone must be exactly 10 digits
const PHONE_REGEX = /^\d{10}$/

// Full name: only letters (including Vietnamese) + spaces
// Disallow special characters and numbers
const NAME_REGEX = /^[a-zA-ZÀ-ỹ\s]+$/u

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        { message: 'Invalid JSON body' },
        { status: 400 },
      )
    }

    const { full_name, phone, email, password } = body as {
      full_name?: string
      phone?: string
      email?: string
      password?: string
    }

    // 1) Required fields
    if (!full_name || !phone || !email || !password) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 })
    }

    const fullNameTrimmed = full_name.trim()
    const emailNormalized = email.trim().toLowerCase()
    const phoneTrimmed = phone.trim()

    // 2) Validate full name: no special chars
    if (!NAME_REGEX.test(fullNameTrimmed)) {
      return NextResponse.json(
        { message: 'Full name must not contain special characters or numbers' },
        { status: 400 },
      )
    }

    // 3) Validate phone: exactly 10 digits
    if (!PHONE_REGEX.test(phoneTrimmed)) {
      return NextResponse.json(
        { message: 'Phone number must be exactly 10 digits' },
        { status: 400 },
      )
    }

    // 4) Validate password length >= 6
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 },
      )
    }

    // 5) Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 409 },
      )
    }

    // 6) Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // 7) Create user
    const user = await prisma.user.create({
      data: {
        full_name: fullNameTrimmed,
        phone: phoneTrimmed,
        email: emailNormalized,
        password_hash,
        role: 'customer',
      },
    })

    // 8) Response
    return NextResponse.json(
      {
        message: 'Register successful',
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
      { message: 'Something went wrong' },
      { status: 500 },
    )
  }
}
