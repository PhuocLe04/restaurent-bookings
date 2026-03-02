'use client'

import { useEffect } from 'react'

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const body = document.body
    const html = document.documentElement

    // lưu trạng thái cũ để restore chuẩn
    const prevOverflow = body.style.overflow
    const prevPosition = body.style.position
    const prevTop = body.style.top
    const prevWidth = body.style.width
    const prevPaddingRight = body.style.paddingRight
    const prevTouchAction = body.style.touchAction

    // giữ vị trí scroll hiện tại
    const scrollY = window.scrollY

    // bù scrollbar để không bị "nhảy layout"
    const scrollbarWidth = window.innerWidth - html.clientWidth
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    body.style.overflow = 'hidden'
    body.style.touchAction = 'none'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    return () => {
      // restore
      body.style.overflow = prevOverflow
      body.style.position = prevPosition
      body.style.top = prevTop
      body.style.width = prevWidth
      body.style.paddingRight = prevPaddingRight
      body.style.touchAction = prevTouchAction

      // trả lại scroll đúng vị trí
      const y = Math.abs(parseInt(body.style.top || '0', 10)) || scrollY
      window.scrollTo(0, y)
    }
  }, [locked])
}
