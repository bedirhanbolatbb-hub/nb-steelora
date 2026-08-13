'use client'

import { useEffect } from 'react'

const MAX_SHIFT = 24 // px — çok ince bir kayma

/**
 * Hero görsellerine ince parallax. Yalnız `--parallax` CSS değişkenini günceller,
 * layout tetiklemez. Pasif scroll dinleyici + rAF; hareket azaltma tercihinde
 * hiç bağlanmaz.
 */
export default function HeroParallax({ targetId }: { targetId: string }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const el = document.getElementById(targetId)
    if (!el) return

    let frame = 0

    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)))
      el.style.setProperty('--parallax', `${(progress * MAX_SHIFT).toFixed(1)}px`)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetId])

  return null
}
