'use client'

import Image from 'next/image'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY, isRemoteMedia, trendyolCdnMi, trendyolYukleyici } from '@/lib/images'

type Props = {
  src: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}

/**
 * Sunucu bileşenlerinden kullanılabilen duyarlı `fill` görsel (Faz 12).
 *
 * next/image'a `loader` fonksiyonu yalnız istemci bileşeninden verilebilir;
 * CollectionsBand, CategoryRail gibi sunucu bileşenleri bu yüzden tek sabit
 * boyut istiyordu (Lighthouse: koleksiyon kapağı 380 px kutuya 900 px).
 * Bu sarmalayıcı Trendyol görsellerinde `sizes`'a göre basamak seçer; panel
 * medyasında olduğu gibi bırakır.
 */
export default function DuyarliGorsel({ src, alt, sizes, className, priority }: Props) {
  const duyarli = trendyolCdnMi(src)
  return (
    <Image
      src={src}
      loader={duyarli ? trendyolYukleyici : undefined}
      unoptimized={duyarli ? false : isRemoteMedia(src)}
      alt={alt}
      fill
      sizes={sizes}
      quality={IMAGE_QUALITY}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER}
      priority={priority}
      className={className}
    />
  )
}
