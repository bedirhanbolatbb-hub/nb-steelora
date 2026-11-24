import Link from 'next/link'
import { aciklamaBol, type CollectionCard } from '@/lib/collections'
import { cn } from '@/lib/utils'
import DuyarliGorsel from '@/components/store/DuyarliGorsel'
import BolumBasligi from '@/components/home/BolumBasligi'

/**
 * Koleksiyonlar v3 (24 Kas 2026 tasarım denetimi).
 *
 * Eskiden tam genişlikte koyu bir bantta, telefonda her biri neredeyse tam
 * ekran tutan üç kapaktı (1.619 px — ana sayfanın altıda biri); başlık ve
 * açıklama fotoğrafın üstündeydi. Artık açık zeminde, ürün kartlarıyla aynı
 * 4:5 kutuda; ad ve kısa açıklama fotoğrafın ALTINDA. Telefonda yana
 * kayar (iki kapak + üçüncünün kenarı), geniş ekranda sütunlar (bkz. duzen).
 * Veri kaynağı Faz 5C ile aynı (getCollectionCards).
 */

/**
 * Geniş ekranda sütun sayısı kapak sayısına göre seçilir (24 Kas 2026).
 * Üç sütun sabitken beşinci koleksiyon ikinci satırda boş bir yer bırakıyor,
 * bölüm masaüstünde 1.418 px tutuyordu. Dört ve üstünde kapaklar geniş ekranda
 * tek satıra dizilir (yazı bir kademe küçülür); tablette satır başına iki ya
 * da üç kapak kalır. Sınıf adları açık yazılı: Tailwind yalnız kaynakta
 * gördüğü sınıfı üretir.
 */
function duzen(adet: number): { izgara: string; sik: boolean; sizes: string } {
  if (adet <= 3) {
    return {
      izgara: 'sm:grid-cols-3 sm:gap-5 lg:gap-8',
      sik: false,
      sizes: '(max-width: 640px) 44vw, (max-width: 1400px) 33vw, 440px',
    }
  }
  if (adet === 4) {
    return {
      izgara: 'sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6',
      sik: true,
      sizes: '(max-width: 640px) 44vw, (max-width: 1024px) 50vw, (max-width: 1400px) 25vw, 320px',
    }
  }
  if (adet === 5) {
    return {
      izgara: 'sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 lg:gap-6',
      sik: true,
      sizes: '(max-width: 640px) 44vw, (max-width: 1024px) 33vw, (max-width: 1400px) 20vw, 250px',
    }
  }
  return {
    izgara: 'sm:grid-cols-3 sm:gap-5 lg:grid-cols-6 lg:gap-5',
    sik: true,
    sizes: '(max-width: 640px) 44vw, (max-width: 1024px) 33vw, (max-width: 1400px) 17vw, 210px',
  }
}

export default function CollectionsBand({ collections }: { collections: CollectionCard[] }) {
  if (collections.length === 0) return null

  const { izgara, sik, sizes } = duzen(collections.length)

  return (
    <section className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-12 lg:pt-20">
      <BolumBasligi baslik="Koleksiyonlar" />

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0" style={{ scrollbarWidth: 'none' }}>
        <ul className={cn('flex snap-x snap-mandatory gap-3 sm:grid', izgara)}>
          {collections.map((collection, i) => {
            // Uzun açıklamada şeride yalnız giriş cümlesi düşer (koleksiyon
            // sayfasıyla aynı kural); paragraf cümle ortasında kesilmez.
            const giris = aciklamaBol(collection.description).giris
            return (
            <li
              key={collection.slug}
              className="w-[44vw] shrink-0 snap-start sm:w-auto"
              data-reveal
              // Gecikme üçüncü kapakta sabitlenir: telefonda dördüncü ve beşinci
              // kapak yana kaydırınca görünür; artan gecikme "geç geliyor" hissi verirdi.
              style={{ '--reveal-delay': `${Math.min(i, 2) * 60}ms` } as React.CSSProperties}
            >
              <Link prefetch={false} href={`/koleksiyon/${collection.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-surface-muted">
                  {collection.cover && (
                    <DuyarliGorsel
                      src={collection.cover}
                      alt=""
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      sizes={sizes}
                    />
                  )}
                </div>
                <h3
                  className={cn(
                    'mt-3 font-heading text-[18px] font-medium leading-snug text-ink transition-colors group-hover:text-accent-deep',
                    sik ? 'xl:text-[20px]' : 'lg:text-[22px]'
                  )}
                >
                  {collection.name}
                </h3>
                {giris && (
                  <p
                    className={cn(
                      'mt-1 line-clamp-2 font-body text-[13px] leading-snug text-ink-soft',
                      sik ? 'lg:line-clamp-3 xl:text-[14px]' : 'lg:text-[14px]'
                    )}
                  >
                    {giris}
                  </p>
                )}
              </Link>
            </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
