import Link from 'next/link'
import type { CollectionCard } from '@/lib/collections'
import DuyarliGorsel from '@/components/store/DuyarliGorsel'
import BolumBasligi from '@/components/home/BolumBasligi'

/**
 * Koleksiyonlar v3 (24 Kas 2026 tasarım denetimi).
 *
 * Eskiden tam genişlikte koyu bir bantta, telefonda her biri neredeyse tam
 * ekran tutan üç kapaktı (1.619 px — ana sayfanın altıda biri); başlık ve
 * açıklama fotoğrafın üstündeydi. Artık açık zeminde, ürün kartlarıyla aynı
 * 4:5 kutuda; ad ve tek satır açıklama fotoğrafın ALTINDA. Telefonda yana
 * kayar (iki kapak + üçüncünün kenarı), geniş ekranda üç sütun.
 * Veri kaynağı Faz 5C ile aynı (getCollectionCards).
 */
export default function CollectionsBand({ collections }: { collections: CollectionCard[] }) {
  if (collections.length === 0) return null

  return (
    <section className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-12 lg:pt-20">
      <BolumBasligi baslik="Koleksiyonlar" />

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0" style={{ scrollbarWidth: 'none' }}>
        <ul className="flex snap-x snap-mandatory gap-3 sm:grid sm:grid-cols-3 sm:gap-5 lg:gap-8">
          {collections.map((collection, i) => (
            <li
              key={collection.slug}
              className="w-[44vw] shrink-0 snap-start sm:w-auto"
              data-reveal
              style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}
            >
              <Link prefetch={false} href={`/koleksiyon/${collection.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-surface-muted">
                  {collection.cover && (
                    <DuyarliGorsel
                      src={collection.cover}
                      alt=""
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 44vw, (max-width: 1400px) 33vw, 440px"
                    />
                  )}
                </div>
                <h3 className="mt-3 font-heading text-[18px] font-medium leading-snug text-ink transition-colors group-hover:text-accent-deep lg:text-[22px]">
                  {collection.name}
                </h3>
                {/* Faz 11B: açıklamanın tamamı basılır, uzunsa iki satırda kırpılır. */}
                {collection.description && (
                  <p className="mt-1 line-clamp-2 font-body text-[13px] leading-snug text-ink-soft lg:text-[14px]">
                    {collection.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
