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
 * Hero v4 — BÖLÜNMÜŞ DÜZEN (Faz 11B).
 *
 * ÖLÇÜLEN KUSUR: fotoğraf yazının ALTINDA tam kaplama zemindi. Kürasyondan
 * gelen 1800×2400 dikey kare 1506×533 yatay banda `object-cover` ile
 * oturtuluyordu — karenin ~%75'i atılıyordu, ürün çoğu zaman kadraj dışında
 * kalıyordu. Mobilde ise yazı doğrudan ürünün üstüne biniyor, açık saten
 * zeminde açık altın üst etiket okunmuyordu.
 *
 * YENİ DÜZEN — yazı ile fotoğraf AYRI ALANLAR:
 *   · Masaüstü: yazı solda fildişi zeminde, fotoğraf sağda tam boy dikey.
 *   · Mobil: alt alta — önce yazı bloğu, altında fotoğraf. Yazı ürünün
 *     üstüne HİÇ binmez.
 *
 * Üst etiket artık AÇIK zeminde duruyor: `.eyebrow` varsayılanı olan koyu
 * altın (--accent-deep) kullanılır. `.eyebrow-acik` istisnası (koyu fotoğraf
 * üzerinde açık altın) burada KALDIRILDI — zemin artık koyu değil.
 *
 * Değişmeyenler: fotoğraf kaynağı (Kürasyon → homepage_settings.hero_slides),
 * 1-4 slayt, otomatik dönme YOK, manuel ok/nokta/swipe/klavye, geçişte yalnız
 * transform, reduced-motion'da anlık. Slayt yoksa sayfa zaten HeroCinema
 * tipografi düzenine düşüyor (page.tsx) — o davranış korundu.
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
      className="relative overflow-hidden bg-bg"
      onTouchStart={coklu ? onTouchStart : undefined}
      onTouchEnd={coklu ? onTouchEnd : undefined}
      aria-roledescription={coklu ? 'carousel' : undefined}
    >
      {/* Slayt rayı — yalnız transform anime edilir */}
      <div
        className="flex motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,0.61,0.36,1)]"
        style={{ transform: `translateX(-${aktif * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div key={s.id} className="w-full shrink-0" aria-hidden={i !== aktif}>
            {/* Fotoğrafın boyu SABİT vh değil, kendi oranından gelir:
                vh'ye bağlıyken oran ekran genişliğiyle kayıyordu (ölçüm:
                1024px'de 0.58, 1920px'de 1.08). Artık 4:5 sütunun kendi
                oranı; yalnız çok geniş ekranlarda yükseklik sınırı devreye
                girer. Satırın yüksekliğini fotoğraf belirler, yazı sütunu
                ona göre uzar. */}
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr]">
              {/* ── Yazı: fildişi zemin, fotoğrafın üstünde DEĞİL ── */}
              <div className="order-1 flex items-center bg-bg px-5 py-10 sm:px-8 md:px-10 md:py-14 lg:px-16 lg:py-20">
                <div className="max-w-lg">
                  {s.eyebrow && (
                    <p className="eyebrow hero-line" style={{ '--hero-delay': '0ms' } as React.CSSProperties}>
                      {s.eyebrow}
                    </p>
                  )}
                  <h2
                    className="hero-line mt-3 font-heading text-[34px] font-medium leading-[1.08] text-ink sm:text-[44px] lg:text-[58px]"
                    style={{ '--hero-delay': '70ms' } as React.CSSProperties}
                  >
                    {s.title}
                  </h2>
                  {s.subtitle && (
                    <p
                      className="hero-line mt-4 max-w-md font-body text-[13px] leading-relaxed text-ink-soft lg:text-[14px]"
                      style={{ '--hero-delay': '140ms' } as React.CSSProperties}
                    >
                      {s.subtitle}
                    </p>
                  )}
                  {s.href && s.cta_label && (
                    <Link
                      href={s.href}
                      tabIndex={i === aktif ? 0 : -1}
                      className="hero-line mt-7 inline-flex min-h-[44px] items-center rounded-[4px] bg-ink px-8 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-bg transition-colors hover:bg-accent-deep"
                      style={{ '--hero-delay': '210ms' } as React.CSSProperties}
                    >
                      {s.cta_label}
                    </Link>
                  )}
                </div>
              </div>

              {/* ── Fotoğraf: kendi alanı, dikey oran ── */}
              <div className="relative order-2 aspect-[3/4] w-full sm:aspect-[4/3] md:aspect-[4/5] md:max-h-[min(900px,86vh)]">
                {s.href ? (
                  <Link
                    href={s.href}
                    className="absolute inset-0"
                    tabIndex={i === aktif ? 0 : -1}
                    aria-label={s.title}
                  >
                    <Gorsel slayt={s} ilk={i === 0} />
                  </Link>
                ) : (
                  <div className="absolute inset-0">
                    <Gorsel slayt={s} ilk={i === 0} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {coklu && (
        <>
          {/* Oklar — fotoğraf sütununun üzerinde durur */}
          <button
            onClick={() => git(aktif - 1)}
            aria-label="Önceki slayt"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/15 bg-bg/80 text-ink/70 transition-colors hover:border-ink/40 hover:text-ink sm:flex lg:left-6"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => git(aktif + 1)}
            aria-label="Sonraki slayt"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink/15 bg-bg/80 text-ink/70 transition-colors hover:border-ink/40 hover:text-ink sm:flex lg:right-6"
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>

          {/* Noktalar rayın ALTINDA kendi satırında: fotoğrafın üstünde
              dururken zemine göre renk değiştirmek gerekiyordu, artık zemin
              her zaman fildişi. */}
          <div className="flex items-center justify-center gap-2 bg-bg pb-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => git(i)}
                aria-label={`Slayt ${i + 1}`}
                aria-current={i === aktif}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  className={cn(
                    'h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-300',
                    i === aktif ? 'w-6 bg-ink' : 'w-1.5 bg-ink/25'
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

function Gorsel({ slayt, ilk }: { slayt: Slayt; ilk: boolean }) {
  return (
    <Image
      src={slayt.image_url}
      unoptimized={isRemoteMedia(slayt.image_url)}
      alt={slayt.title || ''}
      fill
      priority={ilk}
      quality={IMAGE_QUALITY}
      // Fotoğraf artık tam genişlik değil: masaüstünde sütunun payı kadar.
      sizes="(max-width: 767px) 100vw, 42vw"
      placeholder="blur"
      blurDataURL={slayt.image_blur || BLUR_PLACEHOLDER}
      className={ilk ? 'object-cover object-center hero-media' : 'object-cover object-center'}
    />
  )
}
