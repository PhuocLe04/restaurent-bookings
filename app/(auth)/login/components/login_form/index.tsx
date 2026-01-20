'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }
      router.push('/')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="rb-loginHeader">
        <h2>Welcome Back</h2>
        <p>Please login to access your account</p>
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
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="rb-formGroup">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="rb-formControl"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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
          <Link className="rb-link" href="/quen-mat-khau">
            Forgot your password?
          </Link>
        </p>
        <p>
          Don&apos;t have an account?{' '}
          <Link className="rb-link" href="/register">
            Register Now
          </Link>
        </p>
        <p>
          <Link className="rb-link" href="/">
            Back To Home
          </Link>
        </p>
      </div>
    </>
  )
}
