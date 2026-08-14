import Image from 'next/image'
import Link from 'next/link'
import { firstSentence, type CollectionCard } from '@/lib/collections'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'

/**
 * Anasayfa hikâye şeridi — küratörlü koleksiyonlar.
 *
 * Ürün kartı DEĞİLDİR: her blok bir koleksiyona götürür. Açıklamanın yalnız
 * ilk cümlesi basılır (gösterim katmanı), koleksiyon sayfasında metnin tamamı
 * durur. Bölüm eyebrow'u "Hikâyeler": "Koleksiyon" zaten kategori ızgarasında
 * kullanılıyor, çakışmasın.
 */
export default function CollectionStories({ collections }: { collections: CollectionCard[] }) {
  if (collections.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <div className="mb-8" data-reveal>
        <p className="eyebrow">Hikâyeler</p>
        <h2 className="font-heading text-[34px] font-semibold text-ink mt-2">
          Koleksiyonlar
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
        {collections.map((collection, i) => (
          <Link
            key={collection.slug}
            href={`/koleksiyon/${collection.slug}`}
            className="group block"
            data-reveal
            style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}
          >
            {/* Mobilde daha alçak kutu: üç blok alt alta gelince şerit
                gereğinden uzun bir kaydırma yaratıyordu. */}
            <div className="relative aspect-[4/3] sm:aspect-[3/4] overflow-hidden rounded-[4px] bg-surface-muted">
              {collection.cover ? (
                <Image
                  src={collection.cover}
                  alt={collection.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 100vw, 33vw"
                  quality={IMAGE_QUALITY}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-heading text-[34px] text-line">NB</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-heading text-[20px] font-semibold text-bg drop-shadow-sm">
                  {collection.name}
                </h3>
              </div>
            </div>

            <p className="text-[12px] font-body text-ink-soft leading-relaxed mt-3">
              {firstSentence(collection.description)}
            </p>
            <span className="inline-block mt-2 text-[11px] uppercase tracking-[0.15em] font-body font-medium text-ink border-b border-accent pb-0.5 group-hover:text-accent-deep transition-colors">
              Keşfet →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
