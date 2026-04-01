import Link from 'next/link'
import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/service'
import { getSiteContent } from '@/lib/supabase/content'

export default async function Hero() {
  const c = await getSiteContent()
  // null = placeholder göster
  let heroItems: { image: string | null; slug: string | null }[] = [
    { image: null, slug: null },
    { image: null, slug: null },
    { image: null, slug: null },
  ]

  try {
    const supabase = createServiceClient()
    const sections = ['hero_top', 'hero_bottom_left', 'hero_bottom_right']

    const { data: settings } = await supabase
      .from('homepage_settings')
      .select('section, product_ids')
      .in('section', sections)

    if (settings && settings.length > 0) {
      const allIds = settings
        .flatMap((s) => s.product_ids || [])
        .filter(Boolean)

      if (allIds.length > 0) {
        // products tablosundan çek — is_active filtresi YOK
        const { data: products } = await supabase
          .from('products')
          .select('id, slug, trendyol_images')
          .in('id', allIds)

        const productMap = new Map(
          (products || []).map((p) => [
            p.id,
            { image: (p.trendyol_images as string[])?.[0] ?? null, slug: (p.slug as string) ?? null },
          ])
        )

        heroItems = sections.map((sec) => {
          const row = settings.find((s) => s.section === sec)
          const pid = row?.product_ids?.[0]
          return pid ? (productMap.get(pid) ?? { image: null, slug: null }) : { image: null, slug: null }
        })
      }
    }
  } catch {
    // Placeholder kalır
  }

  return (
    <section className="min-h-[580px] grid grid-cols-1 lg:grid-cols-2">
      {/* Sol: İçerik */}
      <div className="bg-dark-mid flex flex-col justify-center px-8 lg:px-16 py-16 lg:py-0 order-2 lg:order-1">
        <span className="text-gold text-[10px] uppercase tracking-[0.25em] font-body mb-6">
          {c.hero_badge || 'Yeni Koleksiyon — 2026'}
        </span>
        <h1 className="font-heading text-[40px] sm:text-[48px] lg:text-[56px] font-light text-champagne leading-[1.1]">
          {c.hero_title_line1 || 'Her anın'}
          <br />
          <span className="italic text-gold">{c.hero_title_line2 || 'zarif'}</span>
          <br />
          {c.hero_title_line3 || 'tanığı'}
        </h1>
        <p className="text-[12px] font-body text-champagne-mid/60 max-w-sm mt-6 leading-relaxed">
          {c.hero_description || 'Özenle tasarlanmış her bir parça, stilinize zarafet ve anlam katar. Kendinizi özel hissetmeniz için tasarlandı.'}
        </p>
        <Link
          href="/urunler"
          className="inline-flex items-center mt-8 border border-gold text-gold text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3.5 hover:bg-gold hover:text-white transition-all duration-300 self-start"
        >
          {c.hero_cta || 'Koleksiyonu Keşfet'}
        </Link>
      </div>

      {/* Sağ: Görsel Grid */}
      <div className="grid grid-rows-2 grid-cols-2 gap-1 order-1 lg:order-2 min-h-[400px] lg:min-h-0">
        <div className="col-span-2 bg-champagne-dark relative overflow-hidden">
          {heroItems[0].image ? (
            heroItems[0].slug ? (
              <Link href={`/urunler/${heroItems[0].slug}`} className="block absolute inset-0">
                <Image src={heroItems[0].image} alt="Koleksiyon" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
              </Link>
            ) : (
              <Image src={heroItems[0].image} alt="Koleksiyon" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
            </div>
          )}
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          {heroItems[1].image ? (
            heroItems[1].slug ? (
              <Link href={`/urunler/${heroItems[1].slug}`} className="block absolute inset-0">
                <Image src={heroItems[1].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
              </Link>
            ) : (
              <Image src={heroItems[1].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 1</span>
            </div>
          )}
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          {heroItems[2].image ? (
            heroItems[2].slug ? (
              <Link href={`/urunler/${heroItems[2].slug}`} className="block absolute inset-0">
                <Image src={heroItems[2].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
              </Link>
            ) : (
              <Image src={heroItems[2].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 2</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
