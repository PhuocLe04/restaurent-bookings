'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type HeaderProps = {
  isLoggedIn: boolean
}

export default function Header({ isLoggedIn }: HeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // active state cho menu route (VD: /blogs)
  const isBlogsActive = useMemo(
    () => pathname?.startsWith('/blogs'),
    [pathname],
  )

  // header scrolled effect (thay cho main.js)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // khóa scroll khi mở mobile menu (giống template)
  useEffect(() => {
    if (!mobileOpen) return
    document.body.classList.add('mobile-nav-active')
    return () => document.body.classList.remove('mobile-nav-active')
  }, [mobileOpen])

  // đóng dropdown khi đóng mobile
  useEffect(() => {
    if (!mobileOpen) setProfileOpen(false)
  }, [mobileOpen])

  return (
    <header
      id="header"
      className={`header fixed-top ${scrolled ? 'scrolled' : ''}`}
    >
      <div className="topbar d-flex align-items-center">
        <div className="container d-flex justify-content-center justify-content-md-between">
          <div className="contact-info d-flex align-items-center">
            <i className="bi bi-envelope d-flex align-items-center">
              <a href="mailto:contact@example.com">KhangVoKhangVo.com</a>
            </i>
            <i className="bi bi-phone d-flex align-items-center ms-4">
              <span>+84 358777123</span>
            </i>
          </div>

          <div className="languages d-none d-md-flex align-items-center">
            <ul>
              <li>En</li>
              <li>
                <a href="#">De</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="branding d-flex align-items-center">
        <div className="container position-relative d-flex align-items-center justify-content-between">
          <Link
            href="/"
            className="logo d-flex align-items-center me-auto me-xl-0"
          >
            <h1 className="sitename">Restaurantly</h1>
          </Link>

          <nav
            id="navmenu"
            className={`navmenu ${mobileOpen ? 'mobile-nav-active' : ''}`}
          >
            <ul style={mobileOpen ? { display: 'block' } : undefined}>
              {/* Anchor trong cùng trang: dùng /#... */}
              <li>
                <Link
                  href="/#hero"
                  className={
                    !isBlogsActive && pathname === '/' ? 'active' : undefined
                  }
                >
                  Home
                  <br />
                </Link>
              </li>
              <li>
                <Link href="/#about">About</Link>
              </li>
              <li>
                <Link href="/#menu">Menu</Link>
              </li>

              <li>
                <Link
                  href="/blogs"
                  className={isBlogsActive ? 'active' : undefined}
                >
                  Blogs
                </Link>
              </li>

              <li>
                <Link href="/#events">Events</Link>
              </li>
              <li>
                <Link href="/#chefs">Chefs</Link>
              </li>
              <li>
                <Link href="/#gallery">Gallery</Link>
              </li>

              {/* Dropdown */}
              <li className="dropdown">
                <button
                  type="button"
                  className="nav-link d-flex align-items-center justify-content-between w-100"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <span>Profile</span>
                  <i
                    className={`bi bi-chevron-down toggle-dropdown ${profileOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                <ul
                  style={
                    profileOpen ? { display: 'block' } : { display: 'none' }
                  }
                >
                  <li>
                    <Link
                      href="/user/profile"
                      onClick={() => setMobileOpen(false)}
                    >
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/table/history"
                      onClick={() => setMobileOpen(false)}
                    >
                      Reservation History
                    </Link>
                  </li>
                </ul>
              </li>

              <li>
                <Link href="/#contact">Contact</Link>
              </li>
            </ul>

            {/* Mobile toggle */}
            <button
              type="button"
              className="mobile-nav-toggle d-xl-none"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <i className={`bi ${mobileOpen ? 'bi-x' : 'bi-list'}`} />
            </button>
          </nav>

          <div className="d-none d-xl-flex align-items-center">
            <Link className="btn-book-a-table" href="/table/create">
              Book A Table
            </Link>

            {isLoggedIn ? (
              <Link className="btn-book-a-table" href="/user/logout">
                Logout
              </Link>
            ) : (
              <Link className="btn-book-a-table" href="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* nhỏ: cho icon rotate nếu muốn (không bắt buộc) */}
      <style jsx>{`
        .rotate-180 {
          transform: rotate(180deg);
          transition: transform 0.2s ease;
        }
      `}</style>
    </header>
  )
}
