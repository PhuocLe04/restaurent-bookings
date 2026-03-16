import type { ReactNode } from 'react'
import Image from 'next/image'
import './auth.css'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="rb-auth">
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
        <div className="rb-bgBlur" />
        <div className="rb-bgVignette" />
      </div>

      <div className="rb-center">{children}</div>
    </div>
  )
}
