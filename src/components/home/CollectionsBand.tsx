import Link from 'next/link'
import type { CollectionCard } from '@/lib/collections'
import DuyarliGorsel from '@/components/store/DuyarliGorsel'

/**
 * Koleksiyonlar v2 — full-bleed koyu bant, üç büyük görselli hikâye.
 * Veri kaynağı ve tek-cümle kuralı Faz 5C ile aynı (getCollectionCards).
 */
export default function CollectionsBand({ collections }: { collections: CollectionCard[] }) {
  if (collections.length === 0) return null

  return (
    <section className="bg-ink-deep py-16 lg:py-24">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="mb-10 text-center" data-reveal>
          <p className="eyebrow">Hikâyeler</p>
          <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-bg mt-2">Koleksiyonlar</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-8">
          {collections.map((collection, i) => (
            <Link
              key={collection.slug}
              href={`/koleksiyon/${collection.slug}`}
              className="group block"
              data-reveal
              style={{ '--reveal-delay': `${i * 70}ms` } as React.CSSProperties}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-ink">
                {collection.cover ? (
                  <DuyarliGorsel
                    src={collection.cover}
                    alt={collection.name}
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1400px) 33vw, 440px"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-heading text-[34px] text-line/30">
                    NB
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-heading text-[22px] font-medium text-bg">{collection.name}</h3>
                  {/* Faz 11B: burada firstSentence() vardı ve açıklamanın ilk
                      cümlesini basıyordu. "İddialı Parçalar" kartında bu
                      "Sessiz geçmek istemiyorsanız." oluyordu — tek başına
                      yarım kalan, altı boş bir cümle. Açıklamanın tamamı
                      basılıyor, uzun olursa iki satırda kırpılıyor. */}
                  {collection.description && (
                    <p className="clamp-2 mt-1 text-[12px] font-body text-line/85 leading-relaxed">
                      {collection.description}
                    </p>
                  )}
                  <span className="mt-3 inline-block text-[10px] uppercase tracking-[0.18em] font-body text-[#E5C990] border-b border-[#E5C990]/50 pb-0.5">
                    Keşfet →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
