import Image from 'next/image'
import Link from 'next/link'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'

/**
 * Hediye bandı v2 — full-bleed split: sol görsel, sağ metin + CTA.
 * Foto çekimi gelene kadar mevcut en iyi kare (hediye paketi çekimi).
 */
export default function GiftSplit() {
  return (
    <section className="bg-surface-muted">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[480px]">
          <Image
            src="/hediye-paketi.jpg"
            alt="Saten kumaş üzerinde NB Steelora hediye paketi"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            quality={IMAGE_QUALITY}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        </div>
        <div className="flex items-center px-6 py-14 lg:px-16 lg:py-20">
          <div data-reveal>
            <p className="eyebrow">Özel Hediye Paketi</p>
            <h2 className="font-heading text-[30px] lg:text-[40px] font-medium text-ink mt-3 leading-tight">
              Sevdiklerinize özel
              <br />
              hediye paketi
            </h2>
            <p className="text-[13px] font-body text-ink-soft mt-4 leading-relaxed max-w-md">
              Her sipariş, ücretsiz premium hediye kutusunda özenle paketlenir — kutudan
              çıkan an da parçanın kendisi kadar özel olsun diye.
            </p>
            <Link
              href="/urunler"
              className="inline-flex items-center mt-8 bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
            >
              Hediye Seç
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
