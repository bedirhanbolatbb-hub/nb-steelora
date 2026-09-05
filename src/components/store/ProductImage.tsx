'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  BLUR_PLACEHOLDER,
  IMAGE_QUALITY,
  bulanikOnizleme,
  gorselBoyutu,
  isRemoteMedia,
  trendyolCdnMi,
  trendyolYukleyici,
} from '@/lib/images'

type Props = {
  src?: string | null
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
  /**
   * Görselin isteneceği EN (kutu genişliği × ekran yoğunluğu).
   * Faz 12: Trendyol görsellerinde `sizes` verildiyse boyutu artık next/image
   * her ekran için kendisi seçer (trendyolYukleyici); `enBoy` o durumda
   * yalnız `sizes` verilmeyen yerlerde geçerli. Panel medyasında değişmez.
   */
  enBoy?: number
  /** Yüklenene kadar görselin bulanık küçük hâli basılsın mı (F6). */
  bulanik?: boolean
}

/**
 * Ürün görseli + marka placeholder'ı.
 * Görsel yoksa ya da yüklenemezse (onError) ivory zeminli NB monogramı basılır;
 * kırık görsel ikonu hiçbir zaman görünmez.
 *
 * Faz 11A-FIX: iki ekleme var.
 *  · `enBoy` — dosya artık kutusuna göre isteniyor (bkz. lib/images/gorselBoyutu).
 *  · `bulanik` — inene kadar görselin kendi bulanık hâli basılıyor; boş fildişi
 *    kare yanıp sönmüyor.
 */
export default function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className,
  enBoy,
  bulanik,
}: Props) {
  const [failed, setFailed] = useState(false)
  const [yuklendi, setYuklendi] = useState(false)

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg select-none">
        <span className="font-heading text-[28px] font-semibold tracking-[0.18em] text-ink">NB</span>
        <span className="mt-1 h-px w-10 bg-accent" />
        <span className="mt-1.5 text-[8px] font-body tracking-[0.3em] text-muted">STEELORA</span>
      </div>
    )
  }

  // Faz 12: Trendyol görseli + `sizes` → duyarlı yol. next/image her ekran
  // basamağını CDN'den ayrı ister (trendyolYukleyici); tek sabit boyut yok.
  const duyarli = trendyolCdnMi(src) && Boolean(sizes)
  const kaynak = (duyarli ? src : enBoy ? gorselBoyutu(src, enBoy) : src) as string
  const onizleme = bulanik ? bulanikOnizleme(src) : null

  return (
    <>
      {onizleme && (
        /* Dış katman kırpar: blur kenardan taşarsa kutunun dışına sızıyordu.
           İç katmanda yalnız opacity animasyonu var; blur ve ölçek sabit. */
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-300 ${
              yuklendi ? 'opacity-0' : 'opacity-100'
            }`}
            style={{
              backgroundImage: `url("${onizleme}")`,
              filter: 'blur(12px)',
              transform: 'scale(1.06)',
            }}
          />
        </span>
      )}
      <Image
        src={kaynak}
        loader={duyarli ? trendyolYukleyici : undefined}
        unoptimized={duyarli ? false : isRemoteMedia(kaynak)}
        alt={alt}
        fill
        sizes={sizes}
        quality={IMAGE_QUALITY}
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        priority={priority}
        className={className}
        onLoad={() => setYuklendi(true)}
        onError={() => setFailed(true)}
      />
    </>
  )
}
