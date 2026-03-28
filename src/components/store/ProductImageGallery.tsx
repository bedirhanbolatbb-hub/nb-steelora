'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductImageGalleryProps {
  images: string[]
  title: string
}

export default function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const hasImages = images && images.length > 0
  const currentImage = hasImages ? images[activeIndex] : null

  const goTo = (index: number) => {
    if (hasImages) {
      setActiveIndex((index + images.length) % images.length)
    }
  }

  return (
    <>
      <div className="space-y-3">
        {/* Ana görsel */}
        <div
          className="relative aspect-[3/4] bg-champagne-dark overflow-hidden cursor-zoom-in group"
          onClick={() => hasImages && setLightboxOpen(true)}
        >
          {currentImage ? (
            <Image
              src={currentImage}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">
                Ürün Görseli
              </span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {hasImages && images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative w-16 h-20 shrink-0 bg-champagne-dark overflow-hidden border-2 transition-colors',
                  i === activeIndex ? 'border-gold' : 'border-transparent'
                )}
              >
                <Image
                  src={img}
                  alt={`${title} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <div className="fixed inset-0 z-[100] bg-dark/95 flex items-center justify-center">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-champagne hover:text-gold transition-colors"
            aria-label="Kapat"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-4 text-champagne hover:text-gold transition-colors"
                aria-label="Önceki"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-4 text-champagne hover:text-gold transition-colors"
                aria-label="Sonraki"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div className="relative w-full max-w-2xl aspect-[3/4]">
            <Image
              src={currentImage}
              alt={title}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </>
  )
}
