'use client'

import Image from 'next/image'
import { useState } from 'react'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY, isMediaUrl } from '@/lib/images'

type Props = {
  src?: string | null
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
}

/**
 * Ürün görseli + marka placeholder'ı.
 * Görsel yoksa ya da yüklenemezse (onError) ivory zeminli NB monogramı basılır;
 * kırık görsel ikonu hiçbir zaman görünmez.
 */
export default function ProductImage({ src, alt, sizes, priority, className }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg select-none">
        <span className="font-heading text-[28px] font-semibold tracking-[0.18em] text-ink">NB</span>
        <span className="mt-1 h-px w-10 bg-accent" />
        <span className="mt-1.5 text-[8px] font-body tracking-[0.3em] text-muted">STEELORA</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      unoptimized={isMediaUrl(src)}
      alt={alt}
      fill
      sizes={sizes}
      quality={IMAGE_QUALITY}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
