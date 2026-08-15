import Link from 'next/link'
import Image from 'next/image'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'
import { CATEGORIES } from '@/lib/catalog/categories'

/**
 * Kategoriler v2 — yatay kaydırmalı şerit (7 kapak).
 * Görseller homeData katmanından gelir (Faz 9A: sayfada sorgu kalmadı);
 * öncelik panelden yüklenen kapak > seçili ürün > kategorinin ilk ürünü.
 */
export default function CategoryRail({
  categoryImages,
}: {
  categoryImages: Record<string, string | null>
}) {
  return (
    <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-20">
      <div className="mb-8 text-center" data-reveal>
        <p className="eyebrow">Keşfet</p>
        <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">Kategoriler</h2>
      </div>

      {/* Yatay şerit — kaydırma kendi kabında, sayfa taşmaz */}
      <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-4 lg:gap-5 snap-x snap-mandatory min-w-max lg:min-w-0 lg:justify-center">
          {CATEGORIES.map((cat, i) => {
            const imageUrl = categoryImages[cat.slug]
            return (
              <Link
                key={cat.slug}
                href={`/kategori/${cat.slug}`}
                className="group w-[150px] lg:w-[164px] shrink-0 snap-start"
                data-reveal
                style={{ '--reveal-delay': `${i * 35}ms` } as React.CSSProperties}
              >
                <div className="aspect-[3/4] relative overflow-hidden rounded-[4px] bg-surface-muted">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={cat.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      sizes="164px"
                      quality={IMAGE_QUALITY}
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-muted/30 text-[10px] font-body tracking-wider uppercase">
                      {cat.title}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                  <p className="absolute inset-x-0 bottom-3 text-center font-heading text-[15px] text-bg">
                    {cat.title}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
