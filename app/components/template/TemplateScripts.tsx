'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

export default function TemplateScripts() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <Script
        src="/vendor/bootstrap/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/vendor/php-email-form/validate.js"
        strategy="afterInteractive"
      />
      <Script src="/vendor/aos/aos.js" strategy="afterInteractive" />
      <Script
        src="/vendor/glightbox/js/glightbox.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/vendor/imagesloaded/imagesloaded.pkgd.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/vendor/isotope-layout/isotope.pkgd.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="/vendor/swiper/swiper-bundle.min.js"
        strategy="afterInteractive"
      />
    </>
  )
}
