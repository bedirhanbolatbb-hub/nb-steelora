import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { getSiteContent } from '@/lib/supabase/content'
import HeroGrid from './HeroGrid'

export default async function Hero() {
  const c = await getSiteContent()
  const singleMode = c.hero_single_mode === 'true'

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
      const allIds = settings.flatMap((s) => s.product_ids || []).filter(Boolean)

      if (allIds.length > 0) {
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
      <div className="bg-champagne-dark flex flex-col justify-center px-8 lg:px-16 py-16 lg:py-0 order-2 lg:order-1">
        <span className="text-gold text-[10px] uppercase tracking-[0.25em] font-body mb-6">
          {c.hero_badge || 'Yeni Koleksiyon — 2026'}
        </span>
        <h1 className="font-heading text-[40px] sm:text-[48px] lg:text-[56px] font-light text-text-primary leading-[1.1]">
          {c.hero_title_line1 || 'Her anın'}
          <br />
          <span className="italic text-gold">{c.hero_title_line2 || 'zarif'}</span>
          <br />
          {c.hero_title_line3 || 'tanığı'}
        </h1>
        <p className="text-[12px] font-body text-text-secondary max-w-sm mt-6 leading-relaxed">
          {c.hero_description || '316L medikal çelik. Kararmaz, paslanmaz, solmaz.\nHer gün tak, her gün şık görün.'}
        </p>
        <div className="flex items-center gap-6 mt-8">
          <Link
            href="/urunler"
            className="inline-flex items-center border border-text-primary/40 text-text-primary text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3.5 hover:bg-gold hover:text-white hover:border-gold transition-all duration-300"
          >
            {c.hero_cta || 'Koleksiyonu Keşfet'}
          </Link>
          <Link
            href="/kategori/kolye"
            className="text-gold text-[11px] uppercase tracking-widest font-body underline underline-offset-4 hover:text-gold/70 transition-colors"
          >
            Çok Satanlar →
          </Link>
        </div>
      </div>

      {/* Sağ: Görsel Grid */}
      <HeroGrid items={heroItems} singleMode={singleMode} />
    </section>
  )
}
