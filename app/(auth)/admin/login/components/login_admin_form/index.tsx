'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import {
  useWebAuthStore,
  getDefaultTokenExpiry,
} from '@/app/(web)/lib/auth-store'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login_admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // backend sẽ trả "Invalid email or password" cho cả non-admin
        setError(data.message || 'Invalid email or password')
        return
      }

      // ✅ setAuth để UI/middleware sync
      const token: string | undefined = data.token
      const tokenExpireAt: string =
        data.tokenExpireAt ?? getDefaultTokenExpiry()
      const userId: string | undefined = data.user?.id
        ? String(data.user.id)
        : undefined

      if (token) {
        useWebAuthStore.getState().setAuth(token, tokenExpireAt, userId)
      }

      // ✅ Optional: nếu bạn muốn dùng profile chung cho cả web/admin thì giữ,
      // còn không thì có thể bỏ block này.
      if (data.user) {
        useWebAuthStore.getState().setProfile({
          id: String(data.user.id),
          full_name: data.user.full_name ?? null,
          email: data.user.email ?? null,
          phone: data.user.phone ?? null,
        })
      }

      router.push('/app/admin/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="rb-loginHeader">
        <h2>Admin Login</h2>
        <p>Please login to access admin dashboard</p>
      </div>

      {error && (
        <div className="rb-alertDanger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rb-formGroup">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            className="rb-formControl"
            type="email"
            placeholder="Enter admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="rb-formGroup">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="rb-formControl"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          className="rb-btn rb-btnPrimary"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Đang đăng nhập...' : 'Login'}
        </button>
      </form>

      <div className="rb-loginFooter">
        <p>
          <Link className="rb-link" href="/admin/quen-mat-khau">
            Forgot your password?
          </Link>
        </p>

        {/* Admin thường không cho tự register */}
        {/* <p>
          Don&apos;t have an account?{' '}
          <Link className="rb-link" href="/admin/register">
            Register Now
          </Link>
        </p> */}

        <p>
          <Link className="rb-link" href="/">
            Back To Home
          </Link>
        </p>
      </div>
    </>
  )
}
