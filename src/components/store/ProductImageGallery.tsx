'use client'

import { ViewTransition, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY, gorselBoyutu, isRemoteMedia } from '@/lib/images'
import ProductImage from './ProductImage'
import { useKadraj } from './KadrajContext'

interface ProductImageGalleryProps {
  images: string[]
  title: string
  /** Faz 12: kartla paylaşılan geçiş adı (ürün id'si). */
  morphAd?: string
}

/**
 * PDP galerisi v2 ("Sessiz Atölye"): çerçevesiz geniş görünüm + ince thumbnail
 * şeridi (masaüstü); mobilde kaydırmalı şerit + nokta göstergesi.
 * Lightbox davranışları (ESC/ok tuşları/scroll kilidi) aynen korunur.
 */
export default function ProductImageGallery({ images, title, morphAd }: ProductImageGalleryProps) {
  // Faz 36: İLK görsel kartla aynı vitrin kadrajından gelir.
  //  · Hız: ürün sayfasının en büyük öğesi bu görsel (PageSpeed mobil LCP
  //    5,5 sn). Trendyol'un 828 px JPEG'i yerine kendi adresimizden, bir yıl
  //    önbellekli WebP iner — ayrı sunucuya bağlantı da gerekmez.
  //  · Kutu zaten 4:5 (object-cover ortadan kırpıyordu); kadraj ürünü ortalar.
  //  · Karttan ürün sayfasına akan geçişte görsel aynı kalır.
  // Diğer kareler ve büyütme (lightbox) özgün fotoğraf. Panelde bu üründe
  // kadraj kapalıysa ilk kare de özgün.
  const kadrajIlk = useKadraj(morphAd)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)

  const closeLightbox = () => {
    setClosing(true)
    setTimeout(() => {
      setLightboxOpen(false)
      setClosing(false)
    }, 180)
  }

  const hasImages = images && images.length > 0
  const currentImage = hasImages ? images[activeIndex] : null

  const goTo = (index: number) => {
    if (hasImages) {
      setActiveIndex((index + images.length) % images.length)
    }
  }

  // Mobil şeritte hangi kare ortadaysa nokta o kareyi gösterir.
  const onRailScroll = () => {
    const rail = railRef.current
    if (!rail) return
    const i = Math.round(rail.scrollLeft / rail.clientWidth)
    if (i !== activeIndex && i >= 0 && i < images.length) setActiveIndex(i)
  }

  useEffect(() => {
    if (!lightboxOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % images.length)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [lightboxOpen, images.length])

  return (
    <>
      {/* ── Mobil: kaydırmalı şerit + sayaç ──
          24 Kas 2026 tasarım denetimi: nokta satırı fotoğrafın ALTINDA 24 px
          yer tutuyordu; yerine fotoğrafın içinde "1 / 4" sayacı var. */}
      <div className="relative -mx-4 sm:hidden">
        <div
          ref={railRef}
          onScroll={onRailScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {(hasImages ? images : [null]).map((img, i) => {
            const kutu = (
              <div
                key={i}
                className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface-muted"
                onClick={() => hasImages && setLightboxOpen(true)}
              >
                <ProductImage
                  src={img}
                  alt={`${title} ${i + 1}`}
                  // Faz 36: telefon şeridi ile masaüstü ana görseli AYNI ANDA
                  // DOM'da (biri CSS'le gizli) ve ikisi de ön yükleniyordu —
                  // telefonda görünmeyen masaüstü görseli de inip asıl görselle
                  // bant genişliği paylaşıyordu. Gizli olduğu genişlikte `sizes`
                  // 1px der: tarayıcı en küçük adayı (birkaç KB) seçer.
                  sizes="(min-width: 640px) 1px, 100vw"
                  enBoy={900}
                  bulanik
                  kadraj={i === 0 && kadrajIlk ? '45' : null}
                  priority={i === 0}
                  className="object-cover"
                />
              </div>
            )
            // Faz 12: ilk kare karttan akarak gelir (paylaşılan geçiş).
            return i === 0 && morphAd ? (
              <ViewTransition key={i} name={`urun-${morphAd}`} share="morph" default="none">
                {kutu}
              </ViewTransition>
            ) : (
              kutu
            )
          })}
        </div>
        {hasImages && images.length > 1 && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink/60 px-2.5 py-1 font-body text-[12px] font-medium leading-none text-white lining-nums tabular-nums"
          >
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* ── Masaüstü: solda dikey küçük resim şeridi + ana görsel ──
          24 Kas 2026 tasarım denetimi: ana görsel pencereden uzundu (1440×900'de
          785 px), küçük resimler katlamanın altında kalıyordu. Görselin
          genişliği pencere yüksekliğine göre sınırlanır (4:5 korunur, kırpma
          yok); şerit sola alındı, böylece hepsi tek bakışta görünür. */}
      <div className="relative hidden sm:block">
        {hasImages && images.length > 1 && (
          <div
            className="absolute inset-y-0 left-0 flex w-16 flex-col gap-2.5 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`${title} — ${i + 1}. görsel`}
                aria-current={i === activeIndex ? 'true' : undefined}
                className={cn(
                  'relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[3px] bg-surface-muted transition-opacity duration-300',
                  i === activeIndex ? 'opacity-100 ring-1 ring-inset ring-ink' : 'opacity-60 hover:opacity-100'
                )}
              >
                <Image
                  src={gorselBoyutu(img, 128)}
                  unoptimized={isRemoteMedia(img)}
                  // Küçük resimler boş alt metniyle basılıyordu: ekran
                  // okuyucu ve arama motoru dört görseli de adsız görüyordu.
                  alt={`${title} — ${i + 1}. görsel`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  quality={IMAGE_QUALITY}
                />
              </button>
            ))}
          </div>
        )}
        <ViewTransition name={morphAd ? `urun-${morphAd}` : undefined} share="morph" default="none">
        <div
          className={cn(
            'relative aspect-[4/5] max-w-[calc((100svh_-_16rem)_*_0.8)] overflow-hidden rounded-[4px] bg-surface-muted cursor-zoom-in group',
            hasImages && images.length > 1 && 'ml-[76px]'
          )}
          onClick={() => hasImages && setLightboxOpen(true)}
        >
          <ProductImage
            src={currentImage}
            alt={title}
            sizes="(max-width: 639px) 1px, (max-width: 1024px) 100vw, 640px"
            enBoy={1200}
            bulanik
            kadraj={activeIndex === 0 && kadrajIlk ? '45' : null}
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>
        </ViewTransition>
      </div>

      {/* ── Lightbox (davranış aynen) ── */}
      {lightboxOpen && currentImage && (
        <div
          className={`fixed inset-0 z-[100] bg-ink/95 flex items-center justify-center ${
            closing ? 'lightbox-exit' : 'lightbox-enter'
          }`}
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={closeLightbox}
            className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center text-bg hover:text-accent transition-colors"
            aria-label="Kapat"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1) }}
                className="absolute left-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink/40 text-bg hover:text-accent transition-colors sm:left-4"
                aria-label="Önceki"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1) }}
                className="absolute right-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink/40 text-bg hover:text-accent transition-colors sm:right-4"
                aria-label="Sonraki"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-2xl aspect-[3/4]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentImage}
              unoptimized={isRemoteMedia(currentImage)}
              alt={title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 700px"
              quality={IMAGE_QUALITY}
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
          </div>
        </div>
      )}
    </>
  )
}
