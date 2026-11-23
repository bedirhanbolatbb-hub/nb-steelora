import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import DuyarliGorsel from '@/components/store/DuyarliGorsel'
import BolumBasligi from '@/components/home/BolumBasligi'
import { CATEGORIES } from '@/lib/catalog/categories'

/**
 * Kategoriler v3 — ızgara (24 Kas 2026 tasarım denetimi).
 *
 * Eskiden 150×200'lük yedi kapaklı yatay şeritti (436 px): telefonda ekrana
 * iki buçuk kapak sığıyor, kalan dördü kaydırmadan görünmüyordu; adlar
 * fotoğrafın üstünde, koyu perdenin içindeydi. Artık sekiz kutu tek bakışta
 * (telefonda 4×2, geniş ekranda tek sıra), ad fotoğrafın ALTINDA düz yazı,
 * sekizincisi "Tümü". Görseller homeData katmanından gelir (Faz 9A);
 * öncelik panelden yüklenen kapak > seçili ürün > kategorinin ilk ürünü.
 */
export default function CategoryRail({
  categoryImages,
}: {
  categoryImages: Record<string, string | null>
}) {
  return (
    <section className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-10 lg:pt-16">
      <BolumBasligi baslik="Kategoriler" />

      <ul className="grid grid-cols-4 gap-x-2.5 gap-y-5 lg:grid-cols-8 lg:gap-x-5">
        {CATEGORIES.map((cat, i) => {
          const imageUrl = categoryImages[cat.slug]
          return (
            <li key={cat.slug} data-reveal style={{ '--reveal-delay': `${i * 30}ms` } as React.CSSProperties}>
              <Link prefetch={false} href={`/kategori/${cat.slug}`} className="group block text-center">
                <div className="relative aspect-square overflow-hidden rounded-[4px] bg-surface-muted">
                  {imageUrl && (
                    <DuyarliGorsel
                      src={imageUrl}
                      alt=""
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      sizes="(max-width: 1023px) 25vw, 160px"
                      kadraj="11"
                    />
                  )}
                </div>
                <p className="mt-2 font-body text-[13px] font-medium text-ink transition-colors group-hover:text-accent-deep lg:text-[14px]">
                  {cat.title}
                </p>
              </Link>
            </li>
          )
        })}
        <li data-reveal style={{ '--reveal-delay': `${CATEGORIES.length * 30}ms` } as React.CSSProperties}>
          <Link prefetch={false} href="/urunler" className="group block text-center">
            <div className="flex aspect-square items-center justify-center rounded-[4px] bg-surface-muted text-ink transition-colors group-hover:bg-accent-soft">
              <ArrowRight size={22} strokeWidth={1.4} aria-hidden />
            </div>
            <p className="mt-2 font-body text-[13px] font-medium text-ink transition-colors group-hover:text-accent-deep lg:text-[14px]">
              Tümü
            </p>
          </Link>
        </li>
      </ul>
    </section>
  )
}
