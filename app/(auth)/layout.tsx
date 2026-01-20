'use client'

import './auth.css'
import type { ReactNode } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rb-auth">
      {/* Background image */}
      <div className="rb-bg" aria-hidden="true">
        <Image
          src="/img/login.jpg"
          alt=""
          fill
          priority
          className="rb-bgImg"
          sizes="100vw"
        />
        <div className="rb-bgOverlay" />
        <div className="rb-bgVignette" />
      </div>

      {/* CENTER CONTAINER */}
      <motion.div
        className="rb-center"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div className="rb-card">{children}</div>
      </motion.div>
    </div>
  )
}
