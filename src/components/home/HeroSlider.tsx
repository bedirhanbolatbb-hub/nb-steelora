'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY, isRemoteMedia } from '@/lib/images'
import type { HeroSlide } from '@/lib/home/homeData'

type Slayt = HeroSlide & { href: string | null }

/**
 * Hero v3 — kampanya bandı (Faz 9A).
 * 1-4 slayt; tek slayt statik, çoklu slayt ok + nokta göstergeli MANUEL
 * kaydırma. OTOMATİK DÖNME YOK (bilinçli karar). Klavye (←/→) ve dokunmatik
 * swipe destekli; geçiş yalnız transform, reduced-motion'da anlık.
 * Görsel tıklaması ve CTA aynı hedefe gider; hedef geçersizse link üretilmez.
 */
export default function HeroSlider({ slides }: { slides: Slayt[] }) {
  const [aktif, setAktif] = useState(0)
  const dokunusX = useRef<number | null>(null)
  const coklu = slides.length > 1

  const git = useCallback(
    (i: number) => setAktif(((i % slides.length) + slides.length) % slides.length),
    [slides.length]
  )

  // Klavye: hero görünürken ok tuşları
  useEffect(() => {
    if (!coklu) return
    const onKey = (e: KeyboardEvent) => {
      const hero = document.getElementById('hero-slider')
      if (!hero) return
      const r = hero.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) return
      if (e.key === 'ArrowLeft') git(aktif - 1)
      if (e.key === 'ArrowRight') git(aktif + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [coklu, aktif, git])

  const onTouchStart = (e: React.TouchEvent) => {
    dokunusX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (dokunusX.current == null) return
    const fark = e.changedTouches[0].clientX - dokunusX.current
    dokunusX.current = null
    if (Math.abs(fark) > 48) git(aktif + (fark < 0 ? 1 : -1))
  }

  return (
    <section
      id="hero-slider"
      className="relative min-h-[85vh] lg:min-h-[75vh] overflow-hidden bg-ink"
      onTouchStart={coklu ? onTouchStart : undefined}
      onTouchEnd={coklu ? onTouchEnd : undefined}
      aria-roledescription={coklu ? 'carousel' : undefined}
    >
      {/* Slayt rayı — yalnız transform anime edilir */}
      <div
        className="flex h-full min-h-[85vh] lg:min-h-[75vh] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,0.61,0.36,1)]"
        style={{ transform: `translateX(-${aktif * 100}%)` }}
      >
        {slides.map((s, i) => {
          const govde = (
            <>
              <Image
                src={s.image_url}
                unoptimized={isRemoteMedia(s.image_url)}
                alt={s.title || ''}
                fill
                priority={i === 0}
                quality={IMAGE_QUALITY}
                sizes="100vw"
                placeholder="blur"
                blurDataURL={s.image_blur || BLUR_PLACEHOLDER}
                className={i === 0 ? 'object-cover hero-media' : 'object-cover'}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/10" />
            </>
          )
          return (
            <div key={s.id} className="relative w-full shrink-0 flex items-end lg:items-center" aria-hidden={i !== aktif}>
              {s.href ? (
                <Link href={s.href} className="absolute inset-0" tabIndex={i === aktif ? 0 : -1} aria-label={s.title}>
                  {govde}
                </Link>
              ) : (
                <div className="absolute inset-0">{govde}</div>
              )}

              <div className="relative w-full pb-24 pt-40 lg:py-24 pointer-events-none">
                <div className="max-w-[1400px] mx-auto px-4 lg:px-8 w-full">
                  <div className="max-w-xl">
                    {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
                    <h2 className="font-heading text-[40px] sm:text-[54px] lg:text-[64px] font-medium leading-[1.05] mt-3 text-white">
                      {s.title}
                    </h2>
                    {s.subtitle && (
                      <p className="text-[13px] lg:text-[14px] font-body leading-relaxed mt-4 max-w-md text-white/85">
                        {s.subtitle}
                      </p>
                    )}
                    {s.href && s.cta_label && (
                      <Link
                        href={s.href}
                        tabIndex={i === aktif ? 0 : -1}
                        className="pointer-events-auto inline-flex items-center mt-7 bg-bg text-ink text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent hover:text-white transition-colors"
                      >
                        {s.cta_label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {coklu && (
        <>
          {/* Oklar */}
          <button
            onClick={() => git(aktif - 1)}
            aria-label="Önceki slayt"
            className="absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white/80 hover:text-white hover:border-white/60 transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => git(aktif + 1)}
            aria-label="Sonraki slayt"
            className="absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 hidden sm:flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white/80 hover:text-white hover:border-white/60 transition-colors"
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>

          {/* Noktalar */}
          <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => git(i)}
                aria-label={`Slayt ${i + 1}`}
                aria-current={i === aktif}
                className="flex h-8 w-8 items-center justify-center"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-300',
                    i === aktif ? 'w-6 bg-bg' : 'w-1.5 bg-bg/40'
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
