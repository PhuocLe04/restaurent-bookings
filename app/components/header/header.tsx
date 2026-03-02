'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import {
  useWebAuthStore,
  useWebAuthHydrated,
  useWebIsAuthenticated,
  useWebUser,
} from '../../(web)/lib/auth-store'
import './header.css'

// ===== Easing Configurations =====
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_IN_OUT_CUBIC: [number, number, number, number] = [0.65, 0, 0.35, 1]

// Spring configurations
const SPRING_GENTLE = {
  type: 'spring',
  stiffness: 120,
  damping: 14,
  mass: 0.8,
} as const

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const navItemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
}

const mobileMenuItemVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  }),
  exit: { opacity: 0, x: 50, transition: { duration: 0.2 } },
}

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
      mass: 0.5,
    },
  },
}

function getHashFromHref(href: string) {
  const idx = href.indexOf('#')
  if (idx === -1) return null
  return href.slice(idx + 1) || null
}

function scrollToId(id: string, offsetPx: number) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offsetPx
  window.scrollTo({ top, behavior: 'smooth' })
}

interface HeaderClientProps {
  initialIsSolid?: boolean
}

export default function HeaderClient({
  initialIsSolid = false,
}: HeaderClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Auth state
  const isHydrated = useWebAuthHydrated()
  const isLoggedIn = useWebIsAuthenticated()
  const profile = useWebUser()

  // ✅ quyền
  const canSeeAdmin = profile?.role === 'admin'
  const canSeeStaff = profile?.is_staff === true

  useEffect(() => {
    useWebAuthStore.getState().hydrateFromStorage()
  }, [])

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [isHomeHero, setIsHomeHero] = useState(false)
  const [isSolid, setIsSolid] = useState(initialIsSolid)
  const [isScrolling, setIsScrolling] = useState(false)

  // ✅ active theo section (scroll-spy)
  const [activeSection, setActiveSection] = useState<string>('home')

  // Refs
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const closeMobileMenu = () => {
    setMobileOpen(false)
    setProfileOpen(false)
  }

  const isHome = pathname === '/'
  const isBlogsActive = useMemo(
    () => pathname?.startsWith('/blogs'),
    [pathname],
  )

  // Navigation items data
  const navItems = useMemo(
    () => [
      { href: '/#hero', label: 'Home', id: 'home' },
      { href: '/#about', label: 'About', id: 'about' },
      { href: '/#menu', label: 'Menu', id: 'menu' },
      { href: '/blogs', label: 'Blogs', id: 'blogs' },
      { href: '/#events', label: 'Events', id: 'events' },
      { href: '/#chefs', label: 'Chefs', id: 'chefs' },
      { href: '/#gallery', label: 'Gallery', id: 'gallery' },
      { href: '/#contact', label: 'Contact', id: 'contact' },
    ],
    [],
  )

  // ✅ Desktop profile dropdown items (gộp Admin/Staff)
  const desktopProfileItems = useMemo(() => {
    return [
      { href: '/profile', icon: 'bi-person', label: 'My Profile' },
      {
        href: '/reservation-history',
        icon: 'bi-calendar-check',
        label: 'Reservation History',
      },
      ...(canSeeStaff
        ? [{ href: '/staff', icon: 'bi-people', label: 'Staff' }]
        : []),
      ...(canSeeAdmin
        ? [{ href: '/admin/dashboard', icon: 'bi-shield-lock', label: 'Admin' }]
        : []),
    ]
  }, [canSeeAdmin, canSeeStaff])

  // ✅ Mobile profile submenu items (gộp Admin/Staff)
  const mobileProfileItems = useMemo(() => {
    return [
      { href: '/user/profile', label: 'Profile', icon: 'bi-person' },
      {
        href: '/table/history',
        label: 'Reservation History',
        icon: 'bi-calendar-check',
      },
      ...(canSeeStaff
        ? [{ href: '/staff', label: 'Staff', icon: 'bi-people' }]
        : []),
      ...(canSeeAdmin
        ? [{ href: '/admin', label: 'Admin', icon: 'bi-shield-lock' }]
        : []),
    ]
  }, [canSeeAdmin, canSeeStaff])

  // ✅ Header height (offset)
  const getHeaderOffset = () => {
    const h = headerRef.current?.getBoundingClientRect().height ?? 80
    return Math.round(h + 8)
  }

  // ✅ Click nav: smooth scroll theo section + update active
  const handleNavClick = async (href: string) => {
    const hash = getHashFromHref(href)

    // Route /blogs: đi route luôn
    if (!hash) {
      router.push(href)
      closeMobileMenu()
      return
    }

    // Nếu đang không ở Home -> push về Home có hash, rồi scroll sau
    if (!isHome) {
      router.push(`/${'#' + hash}`)
      closeMobileMenu()

      window.setTimeout(() => {
        scrollToId(hash, getHeaderOffset())
        setActiveSection(hash === 'hero' ? 'home' : hash)
      }, 120)
      return
    }

    // Đang ở home: scroll luôn
    closeMobileMenu()
    scrollToId(hash, getHeaderOffset())
    setActiveSection(hash === 'hero' ? 'home' : hash)
  }

  // ✅ LOGOUT handler: call API -> clear store -> refresh -> push login
  const handleLogout = async () => {
    try {
      // 1) gọi logout (ưu tiên POST; fallback GET)
      let res = await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
      }).catch(() => null)

      if (!res || !res.ok) {
        res = await fetch('/api/auth/logout', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        }).catch(() => null)
      }

      // 2) clear Zustand store (đúng với store bạn hiện có)
      const st: any = useWebAuthStore.getState()
      if (typeof st.clearAuth === 'function') st.clearAuth()

      // 3) đóng UI
      setProfileMenuOpen(false)
      closeMobileMenu()

      // 4) refresh để server components + header state cập nhật
      router.refresh()

      // 5) điều hướng
      router.push('/login')
    } catch {
      const st: any = useWebAuthStore.getState()
      if (typeof st.clearAuth === 'function') st.clearAuth()
      setProfileMenuOpen(false)
      closeMobileMenu()
      router.refresh()
      router.push('/login')
    }
  }

  // Scroll handling with rAF
  useEffect(() => {
    const handleScroll = () => {
      lastScrollY.current = window.scrollY

      if (!ticking.current) {
        ticking.current = true
        rafRef.current = window.requestAnimationFrame(() => {
          const scrollY = lastScrollY.current
          setIsSolid(scrollY > 80)
          setIsScrolling(scrollY > 10)
          ticking.current = false
        })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ✅ đánh dấu trang để CSS biết home/inner
  useEffect(() => {
    document.body.dataset.page = pathname === '/' ? 'home' : 'inner'
  }, [pathname])

  // ✅ đo height header thật -> set CSS var để đẩy nội dung xuống
  useEffect(() => {
    const setOffset = () => {
      const h = headerRef.current?.getBoundingClientRect().height ?? 80
      document.documentElement.style.setProperty(
        '--rb-header-offset',
        `${Math.ceil(h)}px`,
      )
    }

    setOffset()
    window.addEventListener('resize', setOffset)
    const t = window.setTimeout(setOffset, 120)

    return () => {
      window.removeEventListener('resize', setOffset)
      window.clearTimeout(t)
    }
  }, [pathname, isSolid])

  // Hero section observer (giữ logic cũ)
  useEffect(() => {
    if (!isHome) {
      setIsHomeHero(false)
      return
    }

    const hero = document.querySelector<HTMLElement>('#hero')
    if (!hero) {
      setIsHomeHero(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsHomeHero(entry.intersectionRatio > 0.7)
        }
      },
      {
        threshold: [0, 0.3, 0.7, 1],
        rootMargin: '0px 0px -15% 0px',
      },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [isHome])

  // ✅ Scroll-spy theo section (IntersectionObserver)
  useEffect(() => {
    if (!isHome) return

    const sectionIds = navItems
      .map((i) => getHashFromHref(i.href))
      .filter(Boolean) as string[]

    // map hero -> home
    const normalize = (id: string) => (id === 'hero' ? 'home' : id)

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (!elements.length) return

    const obs = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null
        for (const e of entries) {
          if (!e.isIntersecting) continue
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e
        }
        if (best?.target?.id) {
          setActiveSection(normalize(best.target.id))
        }
      },
      {
        root: null,
        threshold: [0.15, 0.25, 0.35, 0.5, 0.7],
        rootMargin: `-${getHeaderOffset()}px 0px -55% 0px`,
      },
    )

    elements.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [isHome, navItems])

  // Lock body scroll when mobile menu opens
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow

    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [mobileOpen])

  // Close profile dropdown when mobile closes
  useEffect(() => {
    if (!mobileOpen) {
      const t = setTimeout(() => setProfileOpen(false), 150)
      return () => clearTimeout(t)
    }
  }, [mobileOpen])

  // Close desktop dropdown on click outside
  useEffect(() => {
    if (!profileMenuOpen) return

    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = profileMenuRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [profileMenuOpen])

  // Close mobile when route changes
  useEffect(() => {
    setProfileMenuOpen(false)
    closeMobileMenu()
  }, [pathname])

  const showTopbar = isHome && isHomeHero && !isSolid

  // ✅ Desktop active: ưu tiên blogs route, còn lại theo scroll-spy
  const isNavActive = (itemId: string) => {
    if (itemId === 'blogs') return isBlogsActive
    if (isBlogsActive) return itemId === 'blogs'
    return itemId === activeSection
  }

  return (
    <motion.header
      ref={headerRef}
      id="header"
      className={`header fixed-top ${isSolid ? 'solid' : 'transparent'} ${
        isScrolling ? 'scrolling' : ''
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="header-backdrop"
        animate={{
          opacity: isSolid ? 1 : 0.8,
          backdropFilter: isSolid ? 'blur(10px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Topbar */}
      <AnimatePresence mode="wait">
        {showTopbar && (
          <motion.div
            className="topbar d-flex align-items-center"
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{
              height: 40,
              opacity: 1,
              y: 0,
              transition: {
                height: { duration: 0.4, ease: EASE_OUT_EXPO },
                opacity: { duration: 0.3, delay: 0.1 },
                y: { duration: 0.3, ease: EASE_OUT_EXPO },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              y: -20,
              transition: {
                height: { duration: 0.3, ease: EASE_IN_OUT_CUBIC },
                opacity: { duration: 0.2 },
                y: { duration: 0.2 },
              },
            }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branding */}
      <div className="branding d-flex align-items-center">
        <div className="container position-relative d-flex align-items-center justify-content-between">
          <Link
            href="/"
            className="logo d-flex align-items-center me-auto me-xl-0"
          >
            <motion.h1
              className="sitename"
              whileHover={{
                scale: 1.05,
                textShadow: '0 0 8px rgba(205, 164, 94, 0.5)',
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400 }}
              animate={{
                color: isSolid ? '#fff' : '#cda45e',
              }}
            >
              Restaurantly
            </motion.h1>
          </Link>

          {/* Desktop nav */}
          <nav id="navmenu" className="navmenu d-none d-xl-flex">
            <motion.ul
              className="d-flex align-items-center"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05 },
                },
              }}
              initial="hidden"
              animate="visible"
            >
              {navItems.map((item) => {
                const active = isNavActive(item.id)

                return (
                  <motion.li key={item.id} variants={navItemVariants}>
                    <button
                      type="button"
                      className={`rb-navlink ${active ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.href)}
                    >
                      <motion.span
                        animate={{
                          color: active ? '#cda45e' : 'inherit',
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    </button>

                    {active && (
                      <motion.div
                        className="nav-indicator"
                        layoutId="navIndicator"
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.li>
                )
              })}
            </motion.ul>
          </nav>

          {/* Desktop actions */}
          <div className="d-none d-xl-flex align-items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link className="btn-book-a-table" href="/reservations">
                <motion.span>Book A Table</motion.span>
              </Link>
            </motion.div>

            {isHydrated && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                {isLoggedIn ? (
                  <div
                    className="rb-profileWrap"
                    ref={profileMenuRef}
                    onMouseEnter={() => setProfileMenuOpen(true)}
                    onMouseLeave={() => setProfileMenuOpen(false)}
                  >
                    <motion.button
                      className="btn-book-a-table"
                      onClick={(e) => {
                        e.preventDefault()
                        setProfileMenuOpen((v) => !v)
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{
                        backgroundColor: profileMenuOpen
                          ? 'rgba(205, 164, 94, 0.2)'
                          : 'transparent',
                      }}
                    >
                      <span>Profile</span>
                      <motion.i
                        className="bi bi-chevron-down ms-1"
                        animate={{ rotate: profileMenuOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.button>

                    <AnimatePresence>
                      {profileMenuOpen && (
                        <motion.div
                          role="menu"
                          className="rb-profileDropdown"
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
                          <motion.div
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.05 },
                              },
                            }}
                          >
                            {desktopProfileItems.map((it) => (
                              <motion.div
                                key={it.href}
                                variants={{
                                  hidden: { opacity: 0, x: -10 },
                                  visible: { opacity: 1, x: 0 },
                                }}
                                whileHover={{ x: 5 }}
                              >
                                <Link
                                  role="menuitem"
                                  className="rb-profileDropdownItem"
                                  href={it.href}
                                  onClick={() => setProfileMenuOpen(false)}
                                >
                                  <i className={`bi ${it.icon} me-2`} />
                                  {it.label}
                                </Link>
                              </motion.div>
                            ))}

                            <motion.div
                              className="rb-profileDropdownDivider"
                              variants={{
                                hidden: { scaleX: 0 },
                                visible: { scaleX: 1 },
                              }}
                              transition={{ delay: 0.2 }}
                            />

                            {/* ✅ Logout */}
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, x: -10 },
                                visible: { opacity: 1, x: 0 },
                              }}
                              whileHover={{ x: 5 }}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                className="rb-profileDropdownItem text-danger"
                                onClick={handleLogout}
                                style={{
                                  background: 'transparent',
                                  border: 0,
                                  width: '100%',
                                  textAlign: 'left',
                                }}
                              >
                                <i className="bi bi-box-arrow-right me-2" />
                                Logout
                              </button>
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link className="btn-book-a-table" href="/login">
                    <motion.span>Login</motion.span>
                  </Link>
                )}
              </motion.div>
            )}
          </div>

          {/* Mobile toggle */}
          <motion.button
            type="button"
            className="mobile-nav-toggle d-xl-none"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((v) => !v)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              rotate: mobileOpen ? 90 : 0,
              backgroundColor: mobileOpen
                ? 'rgba(205, 164, 94, 0.2)'
                : 'transparent',
            }}
            transition={{ duration: 0.3, ease: EASE_IN_OUT_CUBIC }}
          >
            <motion.i className={`bi ${mobileOpen ? 'bi-x' : 'bi-list'}`} />
          </motion.button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence mode="wait">
        {mobileOpen && (
          <>
            <motion.div
              className="mobile-menu-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              onClick={closeMobileMenu}
            />

            <motion.aside
              className="mobile-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING_GENTLE}
              style={{ willChange: 'transform' }}
            >
              <div className="mobile-drawer-header">
                <h3>Menu</h3>
                <button className="close-drawer" onClick={closeMobileMenu}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <motion.ul className="mobile-menu-list">
                {navItems.map((item, index) => {
                  const active = isNavActive(item.id)

                  return (
                    <motion.li
                      key={item.id}
                      custom={index}
                      variants={mobileMenuItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <button
                        type="button"
                        className={`rb-mobilelink ${active ? 'active' : ''}`}
                        onClick={() => handleNavClick(item.href)}
                      >
                        <motion.span
                          whileHover={{ x: 10 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {item.label}
                        </motion.span>
                      </button>
                    </motion.li>
                  )
                })}

                {/* Profile dropdown (mobile) */}
                <motion.li
                  custom={navItems.length}
                  variants={mobileMenuItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.button
                    type="button"
                    className="nav-link d-flex align-items-center justify-content-between w-100"
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((v) => !v)}
                    whileHover={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span>Profile</span>
                    <motion.i
                      className="bi bi-chevron-down"
                      animate={{ rotate: profileOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                    />
                  </motion.button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE_IN_OUT_CUBIC }}
                        className="mobile-submenu"
                      >
                        {mobileProfileItems.map((it) => (
                          <motion.li
                            key={it.href}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <Link href={it.href} onClick={closeMobileMenu}>
                              <i className={`bi ${it.icon} me-2`} />
                              {it.label}
                            </Link>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </motion.li>

                {/* Actions (mobile) */}
                <motion.li
                  custom={navItems.length + 2}
                  variants={mobileMenuItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mt-4"
                >
                  <Link
                    className="btn-book-a-table w-100 text-center"
                    href="/table/create"
                    onClick={closeMobileMenu}
                  >
                    Book A Table
                  </Link>
                </motion.li>

                {isHydrated && (
                  <motion.li
                    custom={navItems.length + 3}
                    variants={mobileMenuItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {isLoggedIn ? (
                      <button
                        type="button"
                        className="btn-book-a-table w-100 text-center"
                        onClick={handleLogout}
                        style={{ border: 0 }}
                      >
                        Logout
                      </button>
                    ) : (
                      <Link
                        className="btn-book-a-table w-100 text-center"
                        href="/login"
                        onClick={closeMobileMenu}
                      >
                        Login
                      </Link>
                    )}
                  </motion.li>
                )}
              </motion.ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
