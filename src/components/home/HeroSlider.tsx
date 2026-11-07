'use client'

import Image, { getImageProps } from 'next/image'
import Link from 'next/link'
import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY, isRemoteMedia, varyantSec } from '@/lib/images'
import type { HeroSlide } from '@/lib/home/homeData'
import type { IlkEkranKampanyasi } from '@/lib/campaigns/kampanyaVitrini'
import { FREE_SHIPPING_EMPHASIS } from '@/lib/shipping'

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
export default function HeroSlider({
  slides,
  kampanya = null,
}: {
  slides: Slayt[]
  /**
   * Kasım 2026: tüm ürünlerde geçerli koşulsuz indirim yürürlükteyse İLK
   * slaytın yazısı yerine kampanya yazılır (oran, tarih aralığı, düğme).
   * Görsel aynı kalır. Kampanya bitince slaytın kendi yazısı kendiliğinden
   * döner — kodda tarih yok, kaynak kampanya kaydı.
   */
  kampanya?: IlkEkranKampanyasi | null
}) {
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
            {/* Faz 11A-FIX (F7): sütun payı 58/42 idi, fotoğraf yazıdan
                dardı. Vitrin fotoğrafı satmalı — 40/60'a çevrildi. */}
            {s.yerlesim === 'tam' ? (
              <TamSlayt slayt={s} ilk={i === 0} etkin={i === aktif} kampanya={i === 0 ? kampanya : null} />
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr]">
              {/* ── Yazı: fildişi zemin, fotoğrafın üstünde DEĞİL ── */}
              <div className="order-1 flex items-center bg-bg px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-14 lg:px-16 lg:py-20">
                <div className="max-w-lg">
                  {i === 0 && kampanya ? (
                    <KampanyaYazisi k={kampanya} Baslik="h1" etkin={i === aktif} ton="koyu" />
                  ) : (
                  <>
                  {s.eyebrow && (
                    <p className="eyebrow hero-line" style={{ '--hero-delay': '0ms' } as React.CSSProperties}>
                      {s.eyebrow}
                    </p>
                  )}
                  {/* Faz 31: İLK slaydın başlığı h1.
                      ÖLÇÜLEN KUSUR (11 Eyl): ana sayfada HİÇ h1 yoktu — bütün
                      slaytlar h2'ydi, sayfa h2 ile başlıyordu. h1 sayfanın ne
                      olduğunu söyleyen tek başlık; arama motoru ve ekran
                      okuyucu ilk onu arar. Lighthouse erişilebilirlik denetimi
                      de "başlıklar sırayla azalmıyor" derken bunu gösteriyordu.
                      Yalnız ilk slayt h1: sayfada tek h1 olmalı. */}
                  {createElement(
                    i === 0 ? 'h1' : 'h2',
                    {
                      className:
                        'hero-line mt-3 font-heading text-[34px] font-medium leading-[1.08] text-ink sm:text-[44px] lg:text-[58px]',
                      style: { '--hero-delay': '70ms' } as React.CSSProperties,
                    },
                    s.title
                  )}
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
                      className="hero-line basis mt-7 inline-flex min-h-[44px] items-center rounded-[4px] bg-ink px-8 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-bg hover:bg-accent-deep"
                      style={{ '--hero-delay': '210ms' } as React.CSSProperties}
                    >
                      {s.cta_label}
                    </Link>
                  )}
                  </>
                  )}
                  <KargoSatiri ton="koyu" />
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
                {s.yapay_zeka && <YapayZekaNotu />}
              </div>
            </div>
            )}
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

const ODAK_SINIFI = { ust: 'object-top', orta: 'object-center', alt: 'object-bottom' } as const

/**
 * Tam ekran kampanya slaytı (Kasım 2026).
 *
 * Bölünmüş düzen ürün fotoğrafı için doğruydu; modelli kampanya görselinde
 * yazıyı ayrı bir krem bloğa koymak ilk ekranı boş ve şablon gibi
 * gösteriyordu (BB: "profesyonel değil"). Burada görsel alanın tamamı; yazı
 * telefonda görselin altında, masaüstünde solunda, koyulaşan bir perdenin
 * üstünde beyaz. Kontrast perdeden gelir, fotoğrafın tonuna bağlı değil.
 *
 * Telefonda 3:4: görsel ilk ekranın çoğunu alır ama altındaki kategori
 * başlığı görünür kalır (ziyaretçi sayfanın devam ettiğini görür).
 */
function TamSlayt({
  slayt: s,
  ilk,
  etkin,
  kampanya,
}: {
  slayt: Slayt
  ilk: boolean
  etkin: boolean
  kampanya: IlkEkranKampanyasi | null
}) {
  const Baslik = ilk ? 'h1' : 'h2'
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink sm:aspect-[16/10] md:aspect-auto md:h-[min(78vh,760px)] md:min-h-[520px]">
      {s.href ? (
        <Link href={kampanya ? kampanya.hedef : s.href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
          <SanatYonetimliGorsel slayt={s} ilk={ilk} />
        </Link>
      ) : (
        <div className="absolute inset-0">
          <SanatYonetimliGorsel slayt={s} ilk={ilk} />
        </div>
      )}
      {/* Kampanyada perde biraz daha koyu: büyük oran ve tarih satırı her
          fotoğraf tonunda okunmalı. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent md:bg-gradient-to-r md:to-transparent',
          kampanya
            ? 'from-black/75 via-black/25 md:from-black/65 md:via-black/15'
            : 'from-black/65 via-black/15 md:from-black/55 md:via-black/10'
        )}
      />
      {s.yapay_zeka && <YapayZekaNotu />}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-7 sm:px-8 sm:pb-10 md:inset-y-0 md:right-auto md:flex md:w-[min(56%,760px)] md:items-center md:px-14 md:pb-0 lg:px-20">
        <div className="pointer-events-auto max-w-xl text-white">
          {kampanya ? (
            <KampanyaYazisi k={kampanya} Baslik={Baslik} etkin={etkin} ton="acik" />
          ) : (
            <>
              {s.eyebrow && (
                <p
                  className="hero-line font-body text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80"
                  style={{ '--hero-delay': '0ms' } as React.CSSProperties}
                >
                  {s.eyebrow}
                </p>
              )}
              <Baslik
                className="hero-line mt-2 font-heading text-[30px] font-medium leading-[1.08] text-white sm:text-[40px] lg:text-[56px]"
                style={{ '--hero-delay': '70ms' } as React.CSSProperties}
              >
                {s.title}
              </Baslik>
              {s.subtitle && (
                // Telefonda alt metin gizli: görselin alt kısmındaki takıyı
                // (kolyenin ucu, bileklik) yazı bloğu örtmesin.
                <p
                  className="hero-line mt-3 hidden max-w-md font-body text-[13px] leading-relaxed text-white/85 sm:block lg:text-[15px]"
                  style={{ '--hero-delay': '140ms' } as React.CSSProperties}
                >
                  {s.subtitle}
                </p>
              )}
              {s.href && s.cta_label && (
                <Link
                  href={s.href}
                  tabIndex={etkin ? 0 : -1}
                  className="hero-line mt-6 inline-flex min-h-[44px] items-center rounded-[4px] bg-white px-8 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-ink transition-colors hover:bg-bg"
                  style={{ '--hero-delay': '210ms' } as React.CSSProperties}
                >
                  {s.cta_label}
                </Link>
              )}
            </>
          )}
          <KargoSatiri ton="acik" />
        </div>
      </div>
    </div>
  )
}

/**
 * Kampanya yazısı (Kasım 2026) — ilk ekranın tamamı tek mesaja hizmet eder:
 * büyük oran, ne olduğu, ne zamana kadar, nereye tıklanacağı.
 *
 * Tarih satırı ZORUNLU: indirimli satış reklamında başlangıç ve bitiş tarihi
 * yazılmalı (bkz. lib/campaigns/kampanyaVitrini.ts). Telefonda da görünür.
 * Ekran okuyucu başlığı tek cümle olarak okur ("Tüm ürünlerde %25 indirim");
 * görsel bölünme ona yansımaz.
 */
function KampanyaYazisi({
  k,
  Baslik,
  etkin,
  ton,
}: {
  k: IlkEkranKampanyasi
  Baslik: 'h1' | 'h2'
  etkin: boolean
  ton: 'acik' | 'koyu'
}) {
  const acik = ton === 'acik'
  const kalan = k.baslik.replace(k.vurgu, '').replace(/\s{2,}/g, ' ').trim()
  return (
    <>
      <p
        className={cn(
          'hero-line font-body text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px]',
          acik ? 'text-white/90' : 'text-accent-deep'
        )}
        style={{ '--hero-delay': '0ms' } as React.CSSProperties}
      >
        {k.ustBaslik} · {k.tarih}
      </p>
      <Baslik className="hero-line mt-2" style={{ '--hero-delay': '70ms' } as React.CSSProperties}>
        <span className="sr-only">{k.baslik}</span>
        <span aria-hidden="true" className="block">
          <span
            className={cn(
              'block font-heading text-[60px] font-medium leading-[0.95] tracking-[-0.01em] sm:text-[84px] lg:text-[112px]',
              acik ? 'text-[#EBD5A6]' : 'text-accent-deep'
            )}
          >
            {k.vurgu}
          </span>
          <span
            className={cn(
              'mt-1 block font-heading text-[26px] font-medium leading-[1.1] sm:text-[34px] lg:text-[44px]',
              acik ? 'text-white' : 'text-ink'
            )}
          >
            {kalan.charAt(0).toLocaleUpperCase('tr-TR') + kalan.slice(1)}
          </span>
        </span>
      </Baslik>
      <p
        className={cn(
          'hero-line mt-3 hidden max-w-md font-body text-[13px] leading-relaxed sm:block lg:text-[15px]',
          acik ? 'text-white/85' : 'text-ink-soft'
        )}
        style={{ '--hero-delay': '140ms' } as React.CSSProperties}
      >
        {k.aciklama}
      </p>
      <Link
        href={k.hedef}
        tabIndex={etkin ? 0 : -1}
        className={cn(
          'hero-line mt-5 inline-flex min-h-[48px] items-center rounded-[4px] px-9 py-4 font-body text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors sm:mt-6',
          acik ? 'bg-white text-ink hover:bg-bg' : 'bg-ink text-bg hover:bg-accent-deep'
        )}
        style={{ '--hero-delay': '210ms' } as React.CSSProperties}
      >
        {k.cta}
      </Link>
    </>
  )
}

/**
 * Ücretsiz kargo satırı (Kasım 2026) — kampanya olsun olmasın ilk ekranda,
 * telefonda da görünür. BB: "alt limit olmaksızın kargo ücretsiz; ana
 * sayfada dikkat çekici görülmeli." Metin tek kaynaktan (lib/shipping.ts).
 */
function KargoSatiri({ ton }: { ton: 'acik' | 'koyu' }) {
  const acik = ton === 'acik'
  return (
    <p
      className={cn(
        'hero-line mt-4 flex items-center gap-2 font-body text-[12px] font-medium tracking-[0.02em] sm:text-[13px]',
        acik ? 'text-white/90' : 'text-ink-soft'
      )}
      style={{ '--hero-delay': '280ms' } as React.CSSProperties}
    >
      <Truck size={16} strokeWidth={1.6} aria-hidden="true" className={acik ? 'text-[#EBD5A6]' : 'text-accent-deep'} />
      {FREE_SHIPPING_EMPHASIS}
    </p>
  )
}

/**
 * Yapay zekâ açıklaması (Kasım 2026). 1 Ağustos 2026'dan beri reklamda
 * insandan ayırt edilemeyen yapay zekâ karakteri kullanılıyorsa bunun açık,
 * anlaşılır ve ayırt edilebilir biçimde belirtilmesi zorunlu (Ticari Reklam
 * ve Haksız Ticari Uygulamalar Yönetmeliği değişikliği, RG 1 Temmuz 2026).
 * Panel: Kürasyon → slayt → "Görsel yapay zekâ ile üretildi".
 */
function YapayZekaNotu() {
  return (
    <p className="pointer-events-none absolute right-3 top-3 z-[1] rounded-[3px] bg-black/45 px-2 py-1 font-body text-[10px] leading-none tracking-[0.04em] text-white/90 sm:right-4 sm:top-4 sm:text-[11px]">
      Görsel yapay zekâ ile üretilmiştir
    </p>
  )
}

type Varyant = { w: number; url: string }

/** Kayıtta üretilmiş duyarlı kopyalar varsa onlardan seçen yükleyici. */
function varyantYukleyici(varyantlar: Varyant[] | null | undefined, kaynak: string) {
  if (!varyantlar || varyantlar.length < 2) return undefined
  return ({ width }: { width: number }) => varyantSec(varyantlar, width) ?? kaynak
}

/**
 * Sanat yönetimli görsel: masaüstüne yatay ana görsel, telefona (varsa) ayrı
 * dikey görsel. <picture> yalnız ekrana uyanı indirir — ikisi birden inmez,
 * LCP isteği tek kalır. Telefon görseli yoksa ana görsel kullanılır.
 */
function SanatYonetimliGorsel({ slayt, ilk }: { slayt: Slayt; ilk: boolean }) {
  const odak = ODAK_SINIFI[slayt.odak ?? 'orta']
  const ortak = { alt: slayt.title || '', fill: true, quality: IMAGE_QUALITY, sizes: '100vw' } as const

  const masaustuYukleyici = varyantYukleyici(slayt.image_varyant, slayt.image_url)
  const masaustu = getImageProps({
    ...ortak,
    src: slayt.image_url,
    loader: masaustuYukleyici,
    unoptimized: masaustuYukleyici ? false : isRemoteMedia(slayt.image_url),
  }).props

  const mobilKaynak = slayt.image_mobil_url || slayt.image_url
  const mobilVaryant = slayt.image_mobil_url ? slayt.image_mobil_varyant : slayt.image_varyant
  const mobilYukleyici = varyantYukleyici(mobilVaryant, mobilKaynak)
  const mobil = getImageProps({
    ...ortak,
    src: mobilKaynak,
    loader: mobilYukleyici,
    unoptimized: mobilYukleyici ? false : isRemoteMedia(mobilKaynak),
  }).props

  const bulanik = (slayt.image_mobil_url ? slayt.image_mobil_blur : null) || slayt.image_blur || BLUR_PLACEHOLDER
  const { style: mobilStil, ...mobilOzellik } = mobil
  const ayri = Boolean(slayt.image_mobil_url)

  return (
    <picture>
      {/* LCP: <picture> içindeki görsel gövdede geç keşfediliyordu (PageSpeed
          "kaynak yükleme gecikmesi" 480 ms, LCP 2,0 → 3,0 sn). İlk slaytın
          görselleri <head>'de, ekrana göre AYRI ön yüklenir — telefon yalnız
          kendi görselini indirir. React 19 <link>'i head'e taşır. */}
      {ilk && (
        <link
          rel="preload"
          as="image"
          href={mobil.src}
          imageSrcSet={mobil.srcSet}
          imageSizes={mobil.sizes}
          fetchPriority="high"
          media={ayri ? '(max-width: 767px)' : undefined}
        />
      )}
      {ilk && ayri && (
        <link
          rel="preload"
          as="image"
          href={masaustu.src}
          imageSrcSet={masaustu.srcSet}
          imageSizes={masaustu.sizes}
          fetchPriority="high"
          media="(min-width: 768px)"
        />
      )}
      {slayt.image_mobil_url && (
        <source media="(min-width: 768px)" srcSet={masaustu.srcSet ?? masaustu.src} sizes={masaustu.sizes} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- <picture> sanat yönetimi next/image ile kurulamıyor */}
      <img
        {...mobilOzellik}
        loading={ilk ? 'eager' : 'lazy'}
        // Faz 36 dersi: yüksek öncelik açıkça istenmeli (bkz. Gorsel).
        fetchPriority={ilk ? 'high' : undefined}
        className={`object-cover ${odak} ${ilk ? 'hero-media' : ''}`}
        style={{
          ...mobilStil,
          backgroundImage: `url(${bulanik})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </picture>
  )
}

function Gorsel({ slayt, ilk }: { slayt: Slayt; ilk: boolean }) {
  // Faz 12: duyarlı varyantlar kayıt anında üretilmiş olarak gelir; next/image
  // `sizes`'a göre uygun genişliği loader ile seçer. Varyant yoksa (eski
  // kayıt) orijinal, eskisi gibi.
  const varyantlar = slayt.image_varyant ?? null
  const duyarli = Boolean(varyantlar && varyantlar.length > 1)
  const odak = ODAK_SINIFI[slayt.odak ?? 'orta']
  return (
    <Image
      src={slayt.image_url}
      loader={duyarli ? ({ width }) => varyantSec(varyantlar, width) ?? slayt.image_url : undefined}
      unoptimized={duyarli ? false : isRemoteMedia(slayt.image_url)}
      alt={slayt.title || ''}
      fill
      priority={ilk}
      // Faz 36: Next 16'da `priority` yalnız ön yükleme bağlantısı basıyor,
      // öncelik İSTEMİYOR — bağlantı ve <img> "düşük" öncelikle sıraya
      // giriyordu (PageSpeed: "LCP isteği keşfi — fetchpriority=high yok",
      // mobil LCP 4,4 sn). Yüksek öncelik hem bağlantıya hem görsele geçer.
      fetchPriority={ilk ? 'high' : undefined}
      quality={IMAGE_QUALITY}
      // Fotoğraf artık tam genişlik değil: masaüstünde sütunun payı kadar.
      sizes="(max-width: 767px) 100vw, 60vw"
      placeholder="blur"
      blurDataURL={slayt.image_blur || BLUR_PLACEHOLDER}
      // Faz 12: kadraj odağı panelden (üst/orta/alt). F7'nin sabit "üst"
      // hizası bu fotoğrafta takıyı dizüstü ekranında kadraj dışı bırakıyordu.
      // `hero-media`: giriş ölçeği + yüklendikten sonra 8 sn'lik sessiz
      // yakınlaşma (globals.css) — yalnız transform, LCP'ye dokunmaz.
      className={`object-cover ${odak} ${ilk ? 'hero-media' : ''}`}
    />
  )
}
