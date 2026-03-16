'use client'

import 'animate.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import {
  useWebAuthStore,
  useWebAuthHydrated,
  useWebIsAuthenticated,
  useWebUser,
} from '../../(web)/lib/auth-store'
import './header.css'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_IN_OUT_CUBIC: [number, number, number, number] = [0.65, 0, 0.35, 1]

const SPRING_GENTLE = {
  type: 'spring',
  stiffness: 120,
  damping: 14,
  mass: 0.8,
} as const

const SPRING_SOFT = {
  type: 'spring',
  stiffness: 180,
  damping: 18,
  mass: 0.7,
} as const

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const navListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

const navItemVariants = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: EASE_OUT_EXPO,
    },
  },
}

const mobileMenuItemVariants = {
  hidden: { opacity: 0, x: 40 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      type: 'spring' as const,
      stiffness: 280,
      damping: 24,
    },
  }),
  exit: {
    opacity: 0,
    x: 24,
    transition: { duration: 0.2 },
  },
}

const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.96,
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
      mass: 0.55,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.97,
    transition: { duration: 0.16 },
  },
}

function getHashFromHref(href: string) {
  const idx = href.indexOf('#')
  if (idx === -1) return null
  return href.slice(idx + 1) || null
}

function scrollToId(id: string, getOffset: () => number) {
  const el = document.getElementById(id)
  if (!el) return

  const doScroll = () => {
    const offset = getOffset()
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  requestAnimationFrame(() => {
    doScroll()
  })

  window.setTimeout(() => {
    const offset = getOffset()
    const currentTop = el.getBoundingClientRect().top
    const desiredTop = offset

    if (Math.abs(currentTop - desiredTop) > 6) {
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, 520)
}

type BaseNavItem = {
  label: string
  id: string
}

type SimpleNavItem = BaseNavItem & {
  href: string
  icon?: string
}

type DropdownNavItem = BaseNavItem & {
  children: SimpleNavItem[]
}

type NavItem = SimpleNavItem | DropdownNavItem

function isDropdownItem(item: NavItem): item is DropdownNavItem {
  return 'children' in item
}

interface HeaderClientProps {
  initialIsSolid?: boolean
}

export default function HeaderClient({
  initialIsSolid = false,
}: HeaderClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isHydrated = useWebAuthHydrated()
  const isLoggedIn = useWebIsAuthenticated()
  const profile = useWebUser()

  const canSeeAdmin = profile?.role === 'admin'
  const canSeeStaff = profile?.is_staff === true

  useEffect(() => {
    useWebAuthStore.getState().hydrateFromStorage()
  }, [])

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const [isHomeHero, setIsHomeHero] = useState(false)
  const [isSolid, setIsSolid] = useState(initialIsSolid)
  const [isScrolling, setIsScrolling] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('home')

  const headerOffsetRef = useRef(88)
  const getHeaderOffset = useCallback(() => headerOffsetRef.current, [])

  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const servicesMenuRef = useRef<HTMLLIElement | null>(null)
  const headerRef = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)
  const isNavigatingRef = useRef(false)

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false)
    setProfileOpen(false)
    setMobileServicesOpen(false)
  }, [])

  const isHome = pathname === '/'

  const navItems = useMemo<NavItem[]>(
    () => [
      { href: '/#hero', label: 'Trang chủ', id: 'home' },
      { href: '/#about', label: 'Giới thiệu', id: 'about' },
      { href: '/#menu', label: 'Thực đơn', id: 'menu' },
      {
        label: 'Dịch vụ',
        id: 'services-root',
        children: [
          {
            href: '/#services',
            label: 'Dịch vụ nổi bật',
            id: 'services',
            icon: 'bi-stars',
          },
          {
            href: '/services',
            label: 'Xem tất cả dịch vụ',
            id: 'all-services',
            icon: 'bi-grid',
          },
        ],
      },
      { href: '/#contact', label: 'Liên hệ', id: 'contact' },
      { href: '/blogs', label: 'Bài viết', id: 'blogs' },
    ],
    [],
  )

  const desktopProfileItems = useMemo(() => {
    return [
      { href: '/profile', icon: 'bi-person', label: 'Hồ sơ của tôi' },
      {
        href: '/reservation-history',
        icon: 'bi-calendar-check',
        label: 'Lịch sử đặt bàn',
      },
      ...(canSeeStaff
        ? [{ href: '/admin/shifts', icon: 'bi-people', label: 'Nhân viên' }]
        : []),
      ...(canSeeAdmin
        ? [
            {
              href: '/admin/dashboard',
              icon: 'bi-shield-lock',
              label: 'Quản trị',
            },
          ]
        : []),
    ]
  }, [canSeeAdmin, canSeeStaff])

  const mobileProfileItems = useMemo(() => {
    return [
      { href: '/user/profile', label: 'Hồ sơ', icon: 'bi-person' },
      {
        href: '/table/history',
        label: 'Lịch sử đặt bàn',
        icon: 'bi-calendar-check',
      },
      ...(canSeeStaff
        ? [{ href: '/staff', label: 'Nhân viên', icon: 'bi-people' }]
        : []),
      ...(canSeeAdmin
        ? [{ href: '/admin', label: 'Quản trị', icon: 'bi-shield-lock' }]
        : []),
    ]
  }, [canSeeAdmin, canSeeStaff])

  const handleNavClick = useCallback(
    async (href: string) => {
      const hash = getHashFromHref(href)

      isNavigatingRef.current = true
      closeMobileMenu()
      setProfileMenuOpen(false)
      setServicesOpen(false)

      if (!hash) {
        router.push(href)
        isNavigatingRef.current = false
        return
      }

      if (!isHome) {
        router.push(`/#${hash}`)

        setTimeout(() => {
          scrollToId(hash, getHeaderOffset)
          setActiveSection(hash === 'hero' ? 'home' : hash)
          isNavigatingRef.current = false
        }, 320)

        return
      }

      scrollToId(hash, getHeaderOffset)
      setActiveSection(hash === 'hero' ? 'home' : hash)

      setTimeout(() => {
        isNavigatingRef.current = false
      }, 520)
    },
    [closeMobileMenu, getHeaderOffset, isHome, router],
  )

  const handleLogout = async () => {
    try {
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

      const st: any = useWebAuthStore.getState()
      if (typeof st.clearAuth === 'function') st.clearAuth()

      setProfileMenuOpen(false)
      setServicesOpen(false)
      closeMobileMenu()

      router.refresh()
      router.push('/login')
    } catch {
      const st: any = useWebAuthStore.getState()
      if (typeof st.clearAuth === 'function') st.clearAuth()
      setProfileMenuOpen(false)
      setServicesOpen(false)
      closeMobileMenu()
      router.refresh()
      router.push('/login')
    }
  }

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

  useEffect(() => {
    document.body.dataset.page = pathname === '/' ? 'home' : 'inner'
  }, [pathname])

  const updateHeaderOffset = useCallback(() => {
    const h = headerRef.current?.getBoundingClientRect().height ?? 80
    const px = Math.round(h - 16)

    headerOffsetRef.current = px
    document.documentElement.style.setProperty('--rb-header-offset', `${px}px`)

    return px
  }, [])

  useEffect(() => {
    updateHeaderOffset()

    const timeouts = [
      setTimeout(updateHeaderOffset, 100),
      setTimeout(updateHeaderOffset, 300),
      setTimeout(updateHeaderOffset, 500),
    ]

    window.addEventListener('resize', updateHeaderOffset)

    const observer = new ResizeObserver(() => {
      updateHeaderOffset()
    })

    if (headerRef.current) {
      observer.observe(headerRef.current)
    }

    return () => {
      timeouts.forEach(clearTimeout)
      window.removeEventListener('resize', updateHeaderOffset)
      observer.disconnect()
    }
  }, [pathname, isSolid, isHomeHero, updateHeaderOffset])

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
      { threshold: [0, 0.3, 0.7, 1], rootMargin: '0px 0px -15% 0px' },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [isHome])

  useEffect(() => {
    if (!isHome) return

    const applyHash = () => {
      const raw = window.location.hash?.replace('#', '') || 'hero'
      setActiveSection(raw === 'hero' ? 'home' : raw)
    }

    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [isHome])

  useEffect(() => {
    if (!isHome) return

    const sectionIds = navItems
      .flatMap((i) =>
        isDropdownItem(i)
          ? i.children.map((c) => getHashFromHref(c.href))
          : [getHashFromHref(i.href)],
      )
      .filter((id): id is string => !!id && id !== 'blogs')

    const normalize = (id: string) => (id === 'hero' ? 'home' : id)

    const getSections = () =>
      sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => !!el)

    let frame = 0

    const updateActiveSection = () => {
      if (isNavigatingRef.current) return

      const sections = getSections()
      if (!sections.length) return

      const headerOffset = getHeaderOffset()
      const triggerLine = headerOffset + 24

      let currentSection = sections[0]

      for (const section of sections) {
        const rect = section.getBoundingClientRect()

        if (rect.top <= triggerLine) {
          currentSection = section
        } else {
          break
        }
      }

      const next = normalize(currentSection.id)
      setActiveSection((prev) => (prev === next ? prev : next))
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(updateActiveSection)
    }

    updateActiveSection()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [isHome, navItems, getHeaderOffset])

  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow
    const originalTouchAction = document.body.style.touchAction
    const originalPosition = document.body.style.position
    const originalWidth = document.body.style.width
    const scrollY = window.scrollY

    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${scrollY}px`
    }

    return () => {
      const bodyTop = document.body.style.top

      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
      document.body.style.position = originalPosition
      document.body.style.width = originalWidth
      document.body.style.top = ''

      if (mobileOpen && bodyTop) {
        window.scrollTo(0, Math.abs(parseInt(bodyTop || '0', 10)))
      }
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) {
      const t = setTimeout(() => {
        setProfileOpen(false)
        setMobileServicesOpen(false)
      }, 150)
      return () => clearTimeout(t)
    }
  }, [mobileOpen])

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

  useEffect(() => {
    if (!servicesOpen) return

    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = servicesMenuRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setServicesOpen(false)
      }
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [servicesOpen])

  useEffect(() => {
    setProfileMenuOpen(false)
    setServicesOpen(false)
    setMobileServicesOpen(false)
    closeMobileMenu()
  }, [pathname, closeMobileMenu])

  const showTopbar = isHome && isHomeHero && !isSolid

  const isNavActive = useCallback(
    (itemId: string) => {
      if (pathname === '/') {
        return (
          itemId === activeSection ||
          (itemId === 'services-root' && activeSection === 'event')
        )
      }
      if (pathname.startsWith('/blogs')) return itemId === 'blogs'
      if (pathname.startsWith('/services')) {
        return itemId === 'all-services' || itemId === 'services-root'
      }
      return false
    },
    [pathname, activeSection],
  )

  const isNavTextActive = useCallback(
    (itemId: string) => {
      if (pathname === '/') {
        return (
          itemId === activeSection ||
          (itemId === 'services-root' && activeSection === 'event')
        )
      }
      if (pathname.startsWith('/blogs')) return itemId === 'blogs'
      if (pathname.startsWith('/services')) {
        return itemId === 'all-services' || itemId === 'services-root'
      }
      return false
    },
    [pathname, activeSection],
  )

  return (
    <motion.header
      ref={headerRef}
      id="header"
      className={`header fixed-top ${isSolid ? 'solid' : 'transparent'} ${
        isScrolling ? 'scrolling' : ''
      }`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        opacity: { duration: 0.4 },
      }}
    >
      <motion.div
        className="header-backdrop"
        animate={{
          opacity: isSolid ? 1 : 0.8,
          backdropFilter: isSolid ? 'blur(10px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.35, ease: EASE_IN_OUT_CUBIC }}
      />

      <AnimatePresence mode="wait">
        {showTopbar && (
          <motion.div
            className="topbar d-flex align-items-center"
            initial={{ height: 0, opacity: 0, y: -16 }}
            animate={{
              height: 40,
              opacity: 1,
              y: 0,
              transition: {
                height: { duration: 0.4, ease: EASE_OUT_EXPO },
                opacity: { duration: 0.28, delay: 0.08 },
                y: { duration: 0.3, ease: EASE_OUT_EXPO },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              y: -16,
              transition: {
                height: { duration: 0.28, ease: EASE_IN_OUT_CUBIC },
                opacity: { duration: 0.18 },
                y: { duration: 0.18 },
              },
            }}
          >
            <div className="container d-flex justify-content-center justify-content-md-between">
              <motion.div
                className="contact-info d-flex align-items-center animate__animated animate__fadeInDown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.35 }}
              >
                <i className="bi bi-envelope d-flex align-items-center">
                  <a href="mailto:contact@example.com">
                    Lehuuphuoc0804z@gmail.com
                  </a>
                </i>
                <i className="bi bi-phone d-flex align-items-center ms-4">
                  <span>+84 336 428 471</span>
                </i>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="branding d-flex align-items-center">
        <div className="container position-relative d-flex align-items-center justify-content-between">
          <Link
            href="/#hero"
            className="logo d-flex align-items-center me-auto me-xl-0"
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault()
                handleNavClick('/#hero')
              }
            }}
          >
            <motion.h1
              className="sitename animate__animated animate__fadeInLeft"
              whileHover={{
                scale: 1.05,
                textShadow: '0 0 8px rgba(205, 164, 94, 0.5)',
              }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400 }}
              animate={{ color: isSolid ? '#fff' : '#cda45e' }}
            >
              Restaurantly
            </motion.h1>
          </Link>

          <nav id="navmenu" className="navmenu d-none d-xl-flex">
            <motion.ul
              className="d-flex align-items-center"
              variants={navListVariants}
              initial="hidden"
              animate="visible"
            >
              {navItems.map((item) => {
                const active = isNavActive(item.id)
                const textActive = isNavTextActive(item.id)

                if (isDropdownItem(item)) {
                  return (
                    <motion.li
                      key={item.id}
                      ref={servicesMenuRef}
                      variants={navItemVariants}
                      className="rb-nav-dropdown"
                      style={{ position: 'relative' }}
                      whileHover={{ y: -1 }}
                      transition={SPRING_SOFT}
                      onMouseEnter={() => setServicesOpen(true)}
                      onMouseLeave={() => setServicesOpen(false)}
                    >
                      <button
                        type="button"
                        className={`rb-navlink ${active ? 'active' : ''} ${servicesOpen ? 'dropdown-open' : ''}`}
                        onClick={() => setServicesOpen((v) => !v)}
                      >
                        <motion.span
                          className="nav-text"
                          animate={{
                            color: textActive ? '#cda45e' : 'inherit',
                          }}
                          transition={{ duration: 0.22 }}
                        >
                          {item.label}
                        </motion.span>

                        <motion.i
                          className="bi bi-chevron-down rb-nav-caret"
                          animate={{
                            rotate: servicesOpen ? 180 : 0,
                            color: servicesOpen ? '#cda45e' : 'inherit',
                          }}
                          transition={{ duration: 0.22 }}
                          style={{
                            fontSize: '12px',
                            marginLeft: '5px',
                            display: 'inline-block',
                          }}
                        />

                        {/* Thêm hiệu ứng hover background */}
                        <motion.span
                          className="nav-hover-effect"
                          initial={{ opacity: 0, scale: 0.5 }}
                          whileHover={{ opacity: 0.1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#cda45e',
                            borderRadius: 'inherit',
                            zIndex: -1,
                          }}
                        />
                      </button>

                      <AnimatePresence>
                        {active && (
                          <motion.div
                            className="nav-indicator"
                            layoutId="navIndicator"
                            initial={{ opacity: 0, scaleX: 0.7 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0.7 }}
                            transition={{
                              type: 'spring',
                              stiffness: 320,
                              damping: 30,
                            }}
                          />
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {servicesOpen && (
                          <motion.div
                            role="menu"
                            className="rb-profileDropdown animate__animated animate__fadeInDown"
                            variants={dropdownVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            <motion.div
                              variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                  opacity: 1,
                                  transition: { staggerChildren: 0.045 },
                                },
                              }}
                              initial="hidden"
                              animate="visible"
                            >
                              {item.children.map((child) => {
                                const childActive = isNavActive(child.id)

                                return (
                                  <motion.div
                                    key={child.id}
                                    variants={{
                                      hidden: { opacity: 0, x: -10 },
                                      visible: { opacity: 1, x: 0 },
                                    }}
                                    whileHover={{ x: 4 }}
                                    transition={SPRING_SOFT}
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className={`rb-profileDropdownItem rb-servicesProfileItem ${
                                        childActive ? 'active' : ''
                                      }`}
                                      onClick={() => {
                                        setServicesOpen(false)
                                        handleNavClick(child.href)
                                      }}
                                      style={{
                                        background: 'transparent',
                                        border: 0,
                                        width: '100%',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <i
                                        className={`bi ${child.icon || 'bi-arrow-up-right'} me-2`}
                                      />
                                      <span>{child.label}</span>
                                    </button>
                                  </motion.div>
                                )
                              })}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  )
                }

                return (
                  <motion.li
                    key={item.id}
                    variants={navItemVariants}
                    style={{ position: 'relative' }}
                    whileHover={{ y: -1 }}
                    transition={SPRING_SOFT}
                  >
                    <button
                      type="button"
                      className={`rb-navlink ${active ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.href)}
                    >
                      <motion.span
                        animate={{
                          color: textActive ? '#cda45e' : 'inherit',
                        }}
                        transition={{ duration: 0.22 }}
                      >
                        {item.label}
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {active && (
                        <motion.div
                          className="nav-indicator"
                          layoutId="navIndicator"
                          initial={{ opacity: 0, scaleX: 0.7 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          exit={{ opacity: 0, scaleX: 0.7 }}
                          transition={{
                            type: 'spring',
                            stiffness: 320,
                            damping: 30,
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </motion.ul>
          </nav>

          <div className="d-none d-xl-flex align-items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <Link className="btn-book-a-table" href="/reservations">
                <motion.span className="animate__animated animate__fadeIn">
                  Đặt bàn
                </motion.span>
              </Link>
            </motion.div>

            {isHydrated && (
              <motion.div
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.32, duration: 0.4, ease: EASE_OUT_EXPO }}
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
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      animate={{
                        backgroundColor: profileMenuOpen
                          ? 'rgba(205, 164, 94, 0.2)'
                          : 'transparent',
                      }}
                      transition={{ duration: 0.22 }}
                    >
                      <span>Hồ sơ</span>
                      <motion.i
                        className="bi bi-chevron-down ms-1"
                        animate={{ rotate: profileMenuOpen ? 180 : 0 }}
                        transition={{ duration: 0.28 }}
                      />
                    </motion.button>

                    <AnimatePresence>
                      {profileMenuOpen && (
                        <motion.div
                          role="menu"
                          className="rb-profileDropdown animate__animated animate__fadeInDown"
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          <motion.div
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.045 },
                              },
                            }}
                            initial="hidden"
                            animate="visible"
                          >
                            {desktopProfileItems.map((it) => (
                              <motion.div
                                key={it.href}
                                variants={{
                                  hidden: { opacity: 0, x: -10 },
                                  visible: { opacity: 1, x: 0 },
                                }}
                                whileHover={{ x: 4 }}
                                transition={SPRING_SOFT}
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
                                hidden: { scaleX: 0, opacity: 0 },
                                visible: { scaleX: 1, opacity: 1 },
                              }}
                              transition={{ delay: 0.16 }}
                            />

                            <motion.div
                              variants={{
                                hidden: { opacity: 0, x: -10 },
                                visible: { opacity: 1, x: 0 },
                              }}
                              whileHover={{ x: 4 }}
                              transition={SPRING_SOFT}
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
                                Đăng xuất
                              </button>
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link className="btn-book-a-table" href="/login">
                    <motion.span className="animate__animated animate__fadeIn">
                      Đăng nhập
                    </motion.span>
                  </Link>
                )}
              </motion.div>
            )}
          </div>

          <motion.button
            type="button"
            className="mobile-nav-toggle d-xl-none"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMobileOpen((v) => !v)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              rotate: mobileOpen ? 90 : 0,
              backgroundColor: mobileOpen
                ? 'rgba(205, 164, 94, 0.2)'
                : 'transparent',
            }}
            transition={{ duration: 0.28, ease: EASE_IN_OUT_CUBIC }}
          >
            <motion.i
              className={`bi ${mobileOpen ? 'bi-x' : 'bi-list'}`}
              animate={{ rotate: mobileOpen ? 90 : 0 }}
              transition={{ duration: 0.24 }}
            />
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mobileOpen && (
          <>
            <motion.div
              className="mobile-menu-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.28 }}
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
              <motion.div
                className="mobile-drawer-header animate__animated animate__fadeInRight"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28 }}
              >
                <h3>Menu</h3>
                <motion.button
                  className="close-drawer"
                  onClick={closeMobileMenu}
                  whileHover={{ rotate: 90, scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: 0.25 }}
                >
                  <i className="bi bi-x-lg" />
                </motion.button>
              </motion.div>

              <motion.ul className="mobile-menu-list">
                {navItems.map((item, index) => {
                  const active = isNavActive(item.id)
                  const textActive = isNavTextActive(item.id)

                  if (isDropdownItem(item)) {
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
                          onClick={() => setMobileServicesOpen((v) => !v)}
                        >
                          <motion.span
                            animate={{
                              color: textActive ? '#cda45e' : undefined,
                            }}
                            transition={{ type: 'spring', stiffness: 280 }}
                          >
                            {item.label}
                          </motion.span>

                          <motion.i
                            className="bi bi-chevron-down"
                            animate={{ rotate: mobileServicesOpen ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {mobileServicesOpen && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.28,
                                ease: EASE_IN_OUT_CUBIC,
                              }}
                              className="mobile-submenu"
                            >
                              {item.children.map((child, subIndex) => (
                                <motion.li
                                  key={child.id}
                                  initial={{ x: -16, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  transition={{
                                    delay: subIndex * 0.04,
                                    type: 'spring',
                                    stiffness: 280,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="rb-mobile-sublink"
                                    onClick={() => {
                                      setMobileServicesOpen(false)
                                      handleNavClick(child.href)
                                    }}
                                  >
                                    <span>
                                      <i
                                        className={`bi ${child.icon || 'bi-arrow-up-right'} me-2`}
                                      />
                                      {child.label}
                                    </span>
                                    <i className="bi bi-arrow-right-short" />
                                  </button>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    )
                  }

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
                          whileHover={{ x: 8 }}
                          animate={{
                            color: textActive ? '#cda45e' : undefined,
                          }}
                          transition={{ type: 'spring', stiffness: 280 }}
                        >
                          {item.label}
                        </motion.span>
                      </button>
                    </motion.li>
                  )
                })}

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
                    whileTap={{ scale: 0.99 }}
                  >
                    <span>Hồ sơ</span>
                    <motion.i
                      className="bi bi-chevron-down"
                      animate={{ rotate: profileOpen ? 180 : 0 }}
                      transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                    />
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {profileOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE_IN_OUT_CUBIC }}
                        className="mobile-submenu animate__animated animate__fadeInDown"
                      >
                        {mobileProfileItems.map((it, subIndex) => (
                          <motion.li
                            key={it.href}
                            initial={{ x: -16, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{
                              delay: subIndex * 0.04,
                              type: 'spring',
                              stiffness: 280,
                            }}
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
                    <motion.span whileHover={{ letterSpacing: 0.2 }}>
                      Đặt bàn
                    </motion.span>
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
                        Đăng xuất
                      </button>
                    ) : (
                      <Link
                        className="btn-book-a-table w-100 text-center"
                        href="/login"
                        onClick={closeMobileMenu}
                      >
                        Đăng nhập
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
