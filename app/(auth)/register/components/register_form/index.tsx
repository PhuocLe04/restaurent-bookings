'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          email,
          password,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.message || 'Register failed')
        return
      }

      router.push('/login')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="rb-loginHeader">
        <h2>Create Account</h2>
        <p>Register to start booking tables</p>
      </div>

      {error && (
        <div className="rb-alertDanger" role="alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rb-formGroup">
          <label htmlFor="full_name">Full Name</label>
          <input
            id="full_name"
            className="rb-formControl"
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="rb-formGroup">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            className="rb-formControl"
            type="tel"
            placeholder="Enter your phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            disabled={loading}
          />
        </div>

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
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="rb-formGroup">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="rb-formControl"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <div className="rb-formGroup">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            className="rb-formControl"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <button
          className="rb-btn rb-btnPrimary"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Đang đăng ký...' : 'Register'}
        </button>
      </form>

      <div className="rb-loginFooter">
        <p>
          Already have an account?{' '}
          <Link className="rb-link" href="/login">
            Login
          </Link>
        </p>
      </div>
    </>
  )
}
