import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function Hero() {
  let heroImages: string[] = []

  try {
    const supabase = await createClient()

    // Try homepage_settings first
    const sections = ['hero_top', 'hero_bottom_left', 'hero_bottom_right']
    const { data: settings } = await supabase
      .from('homepage_settings')
      .select('section, product_ids')
      .in('section', sections)

    if (settings && settings.length > 0) {
      const allIds = settings.flatMap((s) => s.product_ids || []).filter(Boolean)
      if (allIds.length > 0) {
        const { data: products } = await supabase
          .from('products_display')
          .select('id, display_images')
          .in('id', allIds)

        const productMap = new Map((products || []).map((p) => [p.id, p.display_images?.[0]]))
        heroImages = sections.map((sec) => {
          const row = settings.find((s) => s.section === sec)
          const pid = row?.product_ids?.[0]
          return pid ? productMap.get(pid) || null : null
        }).filter(Boolean) as string[]
      }
    }

    // Fallback: last 3 products
    if (heroImages.length === 0) {
      const { data } = await supabase
        .from('products_display')
        .select('display_images')
        .order('created_at', { ascending: false })
        .limit(3)

      if (data) {
        heroImages = data
          .map((p) => p.display_images?.[0])
          .filter(Boolean) as string[]
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
          Yeni Koleksiyon — 2026
        </span>
        <h1 className="font-heading text-[40px] sm:text-[48px] lg:text-[56px] font-light text-champagne leading-[1.1]">
          Her anın
          <br />
          <span className="italic text-gold">zarif</span>
          <br />
          tanığı
        </h1>
        <p className="text-[12px] font-body text-champagne-mid/60 max-w-sm mt-6 leading-relaxed">
          Özenle tasarlanmış her bir parça, stilinize zarafet ve anlam katar.
          Kendinizi özel hissetmeniz için tasarlandı.
        </p>
        <Link
          href="/urunler"
          className="inline-flex items-center mt-8 border border-gold text-gold text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3.5 hover:bg-gold hover:text-white transition-all duration-300 self-start"
        >
          Koleksiyonu Keşfet
        </Link>
      </div>

      {/* Sağ: Görsel Grid */}
      <div className="grid grid-rows-2 grid-cols-2 gap-1 order-1 lg:order-2 min-h-[400px] lg:min-h-0">
        <div className="col-span-2 bg-champagne-dark relative overflow-hidden">
          {heroImages[0] ? (
            <Image
              src={heroImages[0]}
              alt="Koleksiyon"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">
                Koleksiyon Görseli
              </span>
            </div>
          )}
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          {heroImages[1] ? (
            <Image
              src={heroImages[1]}
              alt="Ürün"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 25vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">
                Ürün 1
              </span>
            </div>
          )}
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          {heroImages[2] ? (
            <Image
              src={heroImages[2]}
              alt="Ürün"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 25vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">
                Ürün 2
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
