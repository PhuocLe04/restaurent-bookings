import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { SignJWT } from 'jose'

export const runtime = 'nodejs'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const TOKEN_DAYS = 7

function getTokenExpireAt(days = TOKEN_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

async function signToken(
  payload: { sub: string; email: string; role: string },
  expireDays = TOKEN_DAYS,
) {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const exp = Math.floor(Date.now() / 1000) + expireDays * 24 * 60 * 60

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(secret)
}

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string
      password?: string
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Missing email or password' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        password_hash: true,
        full_name: true,
        phone: true,
      },
    })

    // ❌ Không tồn tại user
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 },
      )
    }

    // ❌ KHÔNG PHẢI ADMIN → CHẶN LOGIN
    if (user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 },
      )
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 },
      )
    }

    const tokenExpireAt = getTokenExpireAt(TOKEN_DAYS)
    const token = await signToken(
      {
        sub: String(user.id),
        email: user.email,
        role: String(user.role),
      },
      TOKEN_DAYS,
    )

    const baseCookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: TOKEN_DAYS * 24 * 60 * 60,
    }

    const c = cookies()
    ;(await c).set('web_auth_token', token, baseCookieOptions)
    ;(await c).set('web_auth_expire', tokenExpireAt, baseCookieOptions)
    ;(await c).set('web_user_id', String(user.id), baseCookieOptions)

    return NextResponse.json({
      message: 'Login successful',
      token,
      tokenExpireAt,
      user: {
        id: String(user.id),
        email: user.email,
        role: user.role,
        full_name: user.full_name ?? null,
        phone: user.phone ?? null,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 },
    )
  }
}
