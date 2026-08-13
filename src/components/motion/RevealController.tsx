'use client'

import { useEffect } from 'react'

/**
 * Scroll-reveal denetleyicisi.
 *
 * Sunucu çıktısında hiçbir öğe gizli değildir — `.reveal-ready` sınıfı yalnız
 * burada, JS çalıştıktan sonra eklenir. JS yüklenmezse içerik olduğu gibi görünür.
 * Ekranda hâlihazırda görünen öğelere hiç dokunulmaz (hero'da yanıp sönme olmaz,
 * LCP gecikmez). Her öğe bir kez oynar.
 */
// Erken tetikleme payı (px) — hem "zaten görünür" kontrolünde hem observer'da.
const EARLY_TRIGGER_PX = 200

export default function RevealController() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    // Öğe viewport'a girmeden ~200px önce tetiklenir: hızlı scroll'da bölüm,
    // kullanıcı durduğunda çoktan görünür olur.
    const viewportBottom = window.innerHeight + EARLY_TRIGGER_PX
    const targets: HTMLElement[] = []

    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      if (el.dataset.revealDone === '1') return
      // Zaten görünür olanlar animasyonsuz kalır.
      if (el.getBoundingClientRect().top < viewportBottom) {
        el.dataset.revealDone = '1'
        return
      }
      el.classList.add('reveal-ready')
      targets.push(el)
    })

    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.classList.add('is-visible')
          el.dataset.revealDone = '1'
          observer.unobserve(el)
        }
      },
      { rootMargin: `0px 0px ${EARLY_TRIGGER_PX}px 0px`, threshold: 0 }
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null
}
