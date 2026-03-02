/**
 * Web Auth Storage Keys
 */
export const WEB_AUTH_TOKEN_KEY = 'web_auth_token'
export const WEB_AUTH_EXPIRE_KEY = 'web_auth_expire'
export const WEB_USER_ID_KEY = 'web_user_id'
export const WEB_USER_PROFILE_KEY = 'web_user_profile'

/**
 * Cookie options
 */
const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'Lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

/**
 * Set a cookie with value
 */
function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return

  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

  // ✅ chuẩn hoá format cookie
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Expires=${expires.toUTCString()}`,
    `Path=${COOKIE_OPTIONS.path}`,
    `SameSite=${COOKIE_OPTIONS.sameSite}`,
  ]

  if (COOKIE_OPTIONS.secure) parts.push('Secure')

  document.cookie = parts.join('; ')
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const nameEQ = `${name}=`
  const cookies = document.cookie.split(';')

  for (const cookie of cookies) {
    const c = cookie.trim()
    if (c.startsWith(nameEQ)) {
      return decodeURIComponent(c.substring(nameEQ.length))
    }
  }

  return null
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return

  // ✅ xóa cookie đúng chuẩn
  document.cookie = [
    `${name}=`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `Path=${COOKIE_OPTIONS.path}`,
    `SameSite=${COOKIE_OPTIONS.sameSite}`,
    COOKIE_OPTIONS.secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

/**
 * Save auth data to cookies
 */
export function saveWebAuthToStorage(
  token: string,
  tokenExpireAt: string,
  userId?: string,
) {
  setCookie(WEB_AUTH_TOKEN_KEY, token)
  setCookie(WEB_AUTH_EXPIRE_KEY, tokenExpireAt)
  if (userId) setCookie(WEB_USER_ID_KEY, userId)
}

/**
 * Load auth data from cookies
 */
export function loadWebAuthFromStorage(): {
  token: string | null
  tokenExpireAt: string | null
  userId: string | null
} {
  return {
    token: getCookie(WEB_AUTH_TOKEN_KEY),
    tokenExpireAt: getCookie(WEB_AUTH_EXPIRE_KEY),
    userId: getCookie(WEB_USER_ID_KEY),
  }
}

/**
 * Clear auth data from cookies
 */
export function clearWebAuthStorage() {
  deleteCookie(WEB_AUTH_TOKEN_KEY)
  deleteCookie(WEB_AUTH_EXPIRE_KEY)
  deleteCookie(WEB_USER_ID_KEY)
}

/**
 * Get token from storage
 */
export function getWebTokenFromStorage(): string | null {
  return getCookie(WEB_AUTH_TOKEN_KEY)
}

/**
 * Check if token exists in storage
 */
export function hasWebTokenInStorage(): boolean {
  return !!getCookie(WEB_AUTH_TOKEN_KEY)
}

/**
 * Web User Profile type for storage
 */
export interface StoredWebUserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role?: string | null
  is_staff?: boolean
  staff_id?: number | null
}

/**
 * Save user profile to localStorage
 */
export function saveWebProfileToStorage(profile: StoredWebUserProfile) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WEB_USER_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

/**
 * Load user profile from localStorage
 */
export function loadWebProfileFromStorage(): StoredWebUserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(WEB_USER_PROFILE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as StoredWebUserProfile
  } catch {
    return null
  }
}

/**
 * Clear user profile from localStorage
 */
export function clearWebProfileFromStorage() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(WEB_USER_PROFILE_KEY)
  } catch {
    // ignore
  }
}
