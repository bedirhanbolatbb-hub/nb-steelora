'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'
import ProductImage from './ProductImage'

interface ProductImageGalleryProps {
  images: string[]
  title: string
}

/**
 * PDP galerisi v2 ("Sessiz Atölye"): çerçevesiz geniş görünüm + ince thumbnail
 * şeridi (masaüstü); mobilde kaydırmalı şerit + nokta göstergesi.
 * Lightbox davranışları (ESC/ok tuşları/scroll kilidi) aynen korunur.
 */
export default function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
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
      {/* ── Mobil: kaydırmalı şerit + noktalar ── */}
      <div className="sm:hidden">
        <div
          ref={railRef}
          onScroll={onRailScroll}
          className="-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {(hasImages ? images : [null]).map((img, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface-muted"
              onClick={() => hasImages && setLightboxOpen(true)}
            >
              <ProductImage
                src={img}
                alt={`${title} ${i + 1}`}
                sizes="100vw"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {hasImages && images.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === activeIndex ? 'w-5 bg-accent' : 'w-1.5 bg-line'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Masaüstü: geniş çerçevesiz görünüm + ince şerit ── */}
      <div className="hidden sm:block space-y-3">
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-surface-muted cursor-zoom-in group"
          onClick={() => hasImages && setLightboxOpen(true)}
        >
          <ProductImage
            src={currentImage}
            alt={title}
            sizes="(max-width: 1024px) 100vw, 640px"
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>

        {hasImages && images.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`Görsel ${i + 1}`}
                className={cn(
                  'relative w-14 shrink-0 aspect-[4/5] overflow-hidden rounded-[3px] bg-surface-muted transition-opacity duration-300',
                  i === activeIndex
                    ? 'opacity-100 ring-1 ring-accent'
                    : 'opacity-55 hover:opacity-90'
                )}
              >
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  quality={IMAGE_QUALITY}
                />
              </button>
            ))}
          </div>
        )}
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
            className="absolute top-6 right-6 text-bg hover:text-accent transition-colors"
            aria-label="Kapat"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1) }}
                className="absolute left-4 text-bg hover:text-accent transition-colors"
                aria-label="Önceki"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1) }}
                className="absolute right-4 text-bg hover:text-accent transition-colors"
                aria-label="Sonraki"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-2xl aspect-[3/4]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentImage}
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
