'use client'

import { useEffect } from 'react'

export default function TemplateInit() {
  useEffect(() => {
    // ===== Helpers =====
    const qs = <T extends Element = Element>(
      sel: string,
      parent: ParentNode = document,
    ) => parent.querySelector(sel) as T | null
    const qsa = <T extends Element = Element>(
      sel: string,
      parent: ParentNode = document,
    ) => Array.from(parent.querySelectorAll(sel)) as T[]

    // ===== 1) scrolled class on body =====
    const toggleScrolled = () => {
      const body = document.body
      const header = qs<HTMLElement>('#header')
      if (!header) return
      if (
        !header.classList.contains('scroll-up-sticky') &&
        !header.classList.contains('sticky-top') &&
        !header.classList.contains('fixed-top')
      ) {
        return
      }
      window.scrollY > 100
        ? body.classList.add('scrolled')
        : body.classList.remove('scrolled')
    }

    // ===== 2) mobile nav toggle =====
    const mobileToggleBtn = qs<HTMLElement>('.mobile-nav-toggle')

    const mobileNavToggle = () => {
      document.body.classList.toggle('mobile-nav-active')

      // template gốc toggle class trên chính icon element
      if (mobileToggleBtn) {
        mobileToggleBtn.classList.toggle('bi-list')
        mobileToggleBtn.classList.toggle('bi-x')
      }
    }

    const onMobileToggleClick = (e: Event) => {
      e.preventDefault()
      mobileNavToggle()
    }

    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', onMobileToggleClick)
    }

    // ===== 3) hide mobile nav on hash links =====
    const navLinks = qsa<HTMLAnchorElement>('#navmenu a')
    const onNavLinkClick = () => {
      if (document.body.classList.contains('mobile-nav-active'))
        mobileNavToggle()
    }
    navLinks.forEach((a) => a.addEventListener('click', onNavLinkClick))

    // ===== 4) toggle dropdowns in mobile =====
    const dropdownToggles = qsa<HTMLElement>('.navmenu .toggle-dropdown')
    const onDropdownToggle = function (this: HTMLElement, e: Event) {
      e.preventDefault()
      this.parentElement?.classList.toggle('active')
      this.parentElement?.nextElementSibling?.classList.toggle(
        'dropdown-active',
      )
      // tương đương stopImmediatePropagation
      e.stopPropagation()
    }
    dropdownToggles.forEach((el) =>
      el.addEventListener('click', onDropdownToggle as any),
    )

    // ===== 5) preloader =====
    const preloader = qs<HTMLElement>('#preloader')
    const onLoadRemovePreloader = () => {
      preloader?.remove()
    }
    window.addEventListener('load', onLoadRemovePreloader)

    // ===== 6) scroll top button =====
    const scrollTop = qs<HTMLElement>('.scroll-top')
    const toggleScrollTop = () => {
      if (!scrollTop) return
      window.scrollY > 100
        ? scrollTop.classList.add('active')
        : scrollTop.classList.remove('active')
    }
    const onScrollTopClick = (e: Event) => {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    scrollTop?.addEventListener('click', onScrollTopClick)
    window.addEventListener('load', toggleScrollTop)
    document.addEventListener('scroll', toggleScrollTop)

    // ===== 7) AOS init =====
    const aosInit = () => {
      // @ts-expect-error: AOS global từ vendor script
      if (typeof window.AOS === 'undefined') return
      // @ts-expect-error
      window.AOS.init({
        duration: 600,
        easing: 'ease-in-out',
        once: true,
        mirror: false,
      })
    }
    window.addEventListener('load', aosInit)

    // ===== 8) GLightbox init =====
    const glightboxInit = () => {
      // @ts-expect-error
      if (typeof window.GLightbox === 'undefined') return
      // @ts-expect-error
      window.GLightbox({ selector: '.glightbox' })
    }
    glightboxInit()

    // ===== 9) Isotope init =====
    const initIsotopeAll = () => {
      const isoLayouts = qsa<HTMLElement>('.isotope-layout')
      isoLayouts.forEach((isotopeItem) => {
        const layout = isotopeItem.getAttribute('data-layout') ?? 'masonry'
        const filter = isotopeItem.getAttribute('data-default-filter') ?? '*'
        const sort = isotopeItem.getAttribute('data-sort') ?? 'original-order'

        const container = qs<HTMLElement>('.isotope-container', isotopeItem)
        if (!container) return
        if (
          typeof imagesLoaded === 'undefined' ||
          typeof Isotope === 'undefined'
        )
          return

        // @ts-expect-error
        window.imagesLoaded(container, () => {
          // @ts-expect-error
          const iso = new window.Isotope(container, {
            itemSelector: '.isotope-item',
            layoutMode: layout,
            filter,
            sortBy: sort,
          })

          qsa<HTMLElement>('.isotope-filters li', isotopeItem).forEach((li) => {
            const onFilterClick = () => {
              const active = qs<HTMLElement>(
                '.isotope-filters .filter-active',
                isotopeItem,
              )
              active?.classList.remove('filter-active')
              li.classList.add('filter-active')
              iso.arrange({ filter: li.getAttribute('data-filter') || '*' })
              aosInit()
            }
            li.addEventListener('click', onFilterClick)
          })
        })
      })
    }
    initIsotopeAll()

    // ===== 10) Swiper init =====
    const initSwiper = () => {
      // @ts-expect-error
      if (typeof window.Swiper === 'undefined') return

      qsa<HTMLElement>('.init-swiper').forEach((swiperElement) => {
        const configEl = qs<HTMLElement>('.swiper-config', swiperElement)
        if (!configEl) return

        let config: any = {}
        try {
          config = JSON.parse(configEl.innerHTML.trim())
        } catch {
          return
        }

        // @ts-expect-error
        new window.Swiper(swiperElement, config)
      })
    }
    window.addEventListener('load', initSwiper)

    // ===== 11) Correct scroll position if URL has hash =====
    const onLoadHashScroll = () => {
      if (!window.location.hash) return
      const section = qs<HTMLElement>(window.location.hash)
      if (!section) return
      setTimeout(() => {
        const scrollMarginTop = getComputedStyle(section).scrollMarginTop
        window.scrollTo({
          top: section.offsetTop - parseInt(scrollMarginTop || '0', 10),
          behavior: 'smooth',
        })
      }, 100)
    }
    window.addEventListener('load', onLoadHashScroll)

    // ===== 12) Navmenu scrollspy =====
    const navMenuLinks = qsa<HTMLAnchorElement>('.navmenu a')
    const navmenuScrollspy = () => {
      navMenuLinks.forEach((link) => {
        if (!link.hash) return
        const section = qs<HTMLElement>(link.hash)
        if (!section) return

        const position = window.scrollY + 200
        const inRange =
          position >= section.offsetTop &&
          position <= section.offsetTop + section.offsetHeight

        if (inRange) {
          qsa<HTMLAnchorElement>('.navmenu a.active').forEach((a) =>
            a.classList.remove('active'),
          )
          link.classList.add('active')
        } else {
          link.classList.remove('active')
        }
      })
    }
    window.addEventListener('load', navmenuScrollspy)
    document.addEventListener('scroll', navmenuScrollspy)

    // ===== attach scroll listeners =====
    document.addEventListener('scroll', toggleScrolled)
    window.addEventListener('load', toggleScrolled)

    // ===== Cleanup (quan trọng cho Next dev/HMR) =====
    return () => {
      document.removeEventListener('scroll', toggleScrolled)
      window.removeEventListener('load', toggleScrolled)

      if (mobileToggleBtn)
        mobileToggleBtn.removeEventListener('click', onMobileToggleClick)
      navLinks.forEach((a) => a.removeEventListener('click', onNavLinkClick))
      dropdownToggles.forEach((el) =>
        el.removeEventListener('click', onDropdownToggle as any),
      )

      window.removeEventListener('load', onLoadRemovePreloader)

      scrollTop?.removeEventListener('click', onScrollTopClick)
      window.removeEventListener('load', toggleScrollTop)
      document.removeEventListener('scroll', toggleScrollTop)

      window.removeEventListener('load', aosInit)
      window.removeEventListener('load', initSwiper)
      window.removeEventListener('load', onLoadHashScroll)

      window.removeEventListener('load', navmenuScrollspy)
      document.removeEventListener('scroll', navmenuScrollspy)
    }
  }, [])

  return null
}
