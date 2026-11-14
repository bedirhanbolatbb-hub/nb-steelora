import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LISTING_COLUMNS } from '@/lib/catalog/listing'
import { yayindakiPaylasimlar } from '@/lib/instagram/paylasimlar'
import ProductCardV2 from '@/components/store/ProductCardV2'

/**
 * Instagram seçkisi — profildeki bağlantıdan gelenin ilk sayfası.
 *
 * proxy.ts, `/?utm_source=instagram` isteğini adres çubuğunu değiştirmeden
 * buraya yönlendirir; /instagram adresi hikâye bağlantıları için de açık.
 * Paylaşımlar en yenisi üstte, her gönderinin ürünleri gönderideki sırayla.
 * Aynı ürün iki gönderide geçiyorsa yalnız en yenisinde gösterilir.
 *
 * Arama motoruna kapalı: içerik katalogun alt kümesi, ayrı sayfa değeri yok.
 */
export const metadata: Metadata = {
  title: "Instagram'da paylaştıklarımız",
  description: 'NB Steelora Instagram hesabında paylaşılan parçalar, paylaşım sırasıyla.',
  alternates: { canonical: '/instagram' },
  robots: { index: false, follow: true },
}

const tarihBicimi = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Istanbul',
})

export default async function InstagramSayfasi() {
  const paylasimlar = yayindakiPaylasimlar()
  const supabase = await createClient()

  const tumBarkodlar = [...new Set(paylasimlar.flatMap((p) => p.barkodlar))]
  let barkodla = new Map<string, any>()
  if (tumBarkodlar.length > 0) {
    const { data } = await supabase
      .from('products_display')
      .select(`${LISTING_COLUMNS}, trendyol_barcode`)
      .in('trendyol_barcode', tumBarkodlar)
    barkodla = new Map((data || []).map((p: any) => [String(p.trendyol_barcode), p]))
  }

  const gosterilen = new Set<string>()
  const gruplar = paylasimlar
    .map((p) => {
      const urunler = p.barkodlar
        .filter((b) => !gosterilen.has(b))
        .map((b) => {
          gosterilen.add(b)
          return barkodla.get(b)
        })
        .filter(Boolean)
      return { ...p, urunler }
    })
    .filter((g) => g.urunler.length > 0)

  // Paylaşım yoksa (ya da ürünleri pasife düştüyse) sayfa boş kalmasın.
  let yeniler: any[] = []
  if (gruplar.length === 0) {
    const { data } = await supabase
      .from('products_display')
      .select(LISTING_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(8)
    yeniler = data || []
  }

  let sira = 0
  return (
    <div data-nb-yol="/instagram">
      <section className="border-b border-line bg-surface-muted">
        <div className="mx-auto max-w-[1400px] px-4 py-8 text-center lg:px-8 lg:py-12">
          <p className="eyebrow">Instagram · @nbsteelora</p>
          <h1 className="mt-2 font-heading text-[28px] font-medium leading-[1.12] text-ink lg:text-[42px]">
            {"Instagram'da paylaştıklarımız"}
          </h1>
          <p className="mx-auto mt-2 max-w-prose font-body text-[13px] text-ink-soft lg:text-[14px]">
            Profilimizde gördüğünüz parçalar; en yeni paylaşım en üstte.
          </p>
        </div>
      </section>

      {gruplar.map((g) => (
        <section key={g.yayin} className="mx-auto max-w-[1400px] px-4 pt-8 lg:px-8 lg:pt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4 lg:mb-6">
            <h2 className="font-heading text-[20px] font-medium text-ink lg:text-[26px]">{g.baslik}</h2>
            <span className="shrink-0 font-body text-[12px] text-muted">
              {tarihBicimi.format(new Date(g.yayin))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {g.urunler.map((urun: any) => {
              const i = sira++
              return (
                <div key={urun.id}>
                  <ProductCardV2 product={urun} priority={i < 2} />
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {gruplar.length === 0 && yeniler.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pt-8 lg:px-8 lg:pt-12">
          <h2 className="mb-4 font-heading text-[20px] font-medium text-ink lg:mb-6 lg:text-[26px]">
            Yeni gelenler
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {yeniler.map((urun: any, i: number) => (
              <div key={urun.id}>
                <ProductCardV2 product={urun} priority={i < 2} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1400px] px-4 py-12 text-center lg:px-8 lg:py-16">
        <Link
          prefetch={false}
          href="/urunler"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-ink px-8 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.15em] text-bg transition-colors hover:bg-accent-deep"
        >
          Tüm ürünler
        </Link>
      </section>
    </div>
  )
}
