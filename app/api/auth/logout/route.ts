// app/api/logout/route.ts  (hoặc app/logout/route.ts)
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function clearAuthCookies() {
  const cookieStore = await cookies() // ← BẮT BUỘC await ở Next 15+

  const options = {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    // Nếu cookie gốc có domain (ví dụ subdomain), thêm dòng này:
    // domain: process.env.COOKIE_DOMAIN || undefined,  // ví dụ: '.yourdomain.com'
  }

  // Dùng .delete() là cách khuyến nghị chính thức
  cookieStore.delete('web_auth_token')
  cookieStore.delete('web_auth_expire')
  cookieStore.delete('web_user_id')
  cookieStore.delete('user_id')

  // Nếu có cookie khác (refresh_token, session, next-auth.session-token, ...)
  // cookieStore.delete('your-other-cookie', options);
}

export async function POST() {
  await clearAuthCookies()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const response = NextResponse.redirect(new URL('/', baseUrl), 303)

  // Chống cache mạnh
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}

export const GET = POST // cho phép cả GET lẫn POST đều logout
