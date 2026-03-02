'use client'

import { create } from 'zustand'
import {
  clearWebAuthStorage,
  clearWebProfileFromStorage,
  loadWebAuthFromStorage,
  loadWebProfileFromStorage,
  saveWebAuthToStorage,
  saveWebProfileToStorage,
  type StoredWebUserProfile,
} from './auth-storage'

/**
 * Web User Profile type
 */
export type WebUserProfile = StoredWebUserProfile

/**
 * Web Auth Store State
 */
interface WebAuthState {
  // Auth state
  token: string | null
  tokenExpireAt: string | null
  userId: string | null
  isHydrated: boolean

  // User profile
  profile: WebUserProfile | null
  profileLoading: boolean

  // Actions
  setAuth: (token: string, tokenExpireAt: string, userId?: string) => void
  setProfile: (profile: WebUserProfile | null) => void
  updateProfile: (updates: Partial<WebUserProfile>) => void
  setProfileLoading: (loading: boolean) => void
  clearAuth: () => void
  hydrateFromStorage: () => void
  refreshProfileFromServer: () => Promise<void>
  isAuthenticated: () => boolean
}

/**
 * Check if token is expired
 */
function isTokenExpired(tokenExpireAt: string | null): boolean {
  if (!tokenExpireAt) return true

  const expiryDate = new Date(tokenExpireAt)
  if (Number.isNaN(expiryDate.getTime())) return true

  return expiryDate.getTime() <= Date.now()
}

/**
 * Generate default token expiry (24 hours)
 */
export function getDefaultTokenExpiry(): string {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 24)
  return expiry.toISOString()
}

/**
 * Web Auth Store
 */
export const useWebAuthStore = create<WebAuthState>((set, get) => ({
  token: null,
  tokenExpireAt: null,
  userId: null,
  isHydrated: false,

  profile: null,
  profileLoading: false,

  setAuth: (token, tokenExpireAt, userId) => {
    saveWebAuthToStorage(token, tokenExpireAt, userId)
    set({ token, tokenExpireAt, userId: userId ?? null })
  },

  setProfile: (profile) => {
    if (profile) saveWebProfileToStorage(profile)
    else clearWebProfileFromStorage()

    set({ profile })
  },

  updateProfile: (updates) => {
    set((state) => {
      if (!state.profile) return state

      const newProfile: WebUserProfile = { ...state.profile, ...updates }
      saveWebProfileToStorage(newProfile)

      return { profile: newProfile }
    })
  },

  setProfileLoading: (loading) => set({ profileLoading: loading }),

  clearAuth: () => {
    clearWebAuthStorage()
    clearWebProfileFromStorage()
    set({
      token: null,
      tokenExpireAt: null,
      userId: null,
      profile: null,
    })
  },

  // ✅ gọi server để lấy role / is_staff mới nhất
  refreshProfileFromServer: async () => {
    if (typeof window === 'undefined') return
    try {
      set({ profileLoading: true })

      const res = await fetch('/api/profile/staff', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      })

      const data = await res.json().catch(() => null)
      const profile = data?.profile ?? null

      if (profile) {
        saveWebProfileToStorage(profile)
        set({ profile })
      } else {
        clearWebProfileFromStorage()
        set({ profile: null })
      }
    } catch {
      // fail thì giữ profile cũ để UI không nhảy lung tung
    } finally {
      set({ profileLoading: false })
    }
  },

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return

    const { token, tokenExpireAt, userId } = loadWebAuthFromStorage()
    const storedProfile = loadWebProfileFromStorage()

    // ✅ token hợp lệ
    if (token && tokenExpireAt && !isTokenExpired(tokenExpireAt)) {
      set({
        token,
        tokenExpireAt,
        userId,
        profile: storedProfile,
        isHydrated: true,
      })

      // ✅ sau hydrate -> sync profile từ server
      queueMicrotask(() => {
        get().refreshProfileFromServer()
      })
      return
    }

    // ✅ token không hợp lệ/expired → clear sạch
    clearWebAuthStorage()
    clearWebProfileFromStorage()
    set({
      token: null,
      tokenExpireAt: null,
      userId: null,
      profile: null,
      isHydrated: true,
    })
  },

  isAuthenticated: () => {
    const s = get()
    return !!s.token && !isTokenExpired(s.tokenExpireAt)
  },
}))

// Selector hooks
export const useWebIsAuthenticated = () =>
  useWebAuthStore((state) => state.isAuthenticated())
export const useWebAuthToken = () => useWebAuthStore((state) => state.token)
export const useWebAuthHydrated = () =>
  useWebAuthStore((state) => state.isHydrated)
export const useWebUser = () => useWebAuthStore((state) => state.profile)
export const useWebProfileLoading = () =>
  useWebAuthStore((state) => state.profileLoading)
