import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { getSiteContent } from '@/lib/supabase/content'
import HeroGrid from './HeroGrid'
import HeroParallax from '@/components/motion/HeroParallax'

export default async function Hero({ hasMostLoved = false }: { hasMostLoved?: boolean }) {
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
    <section className="min-h-0 lg:min-h-[580px] grid grid-cols-1 lg:grid-cols-2">
      {/* Sol: İçerik.
          Mobilde metin ÖNCE gelir (order-1): görsel kolajı üstte olduğunda
          başlık 614px'te başlıyor, birincil CTA ilk ekranın altında kalıyordu. */}
      <div className="bg-surface-muted flex flex-col justify-center px-8 lg:px-16 py-10 sm:py-14 lg:py-0 order-1">
        {/* Giriş animasyonu saf CSS: JS beklemez, satırlar 70ms arayla yükselir */}
        <span className="eyebrow mb-6 hero-line">{c.hero_badge || 'Yeni Koleksiyon — 2026'}</span>
        <h1
          className="font-heading text-[40px] sm:text-[48px] lg:text-[56px] font-semibold text-ink leading-[1.1] hero-line"
          style={{ '--hero-delay': '70ms' } as React.CSSProperties}
        >
          {c.hero_title_line1 || 'Her anın'}
          <br />
          <span className="italic text-accent-deep">{c.hero_title_line2 || 'zarif'}</span>
          <br />
          {c.hero_title_line3 || 'tanığı'}
        </h1>
        <p
          className="text-[12px] font-body text-ink-soft max-w-sm mt-6 leading-relaxed hero-line"
          style={{ '--hero-delay': '140ms' } as React.CSSProperties}
        >
          {c.hero_description || '316L medikal çelik. Kararmaz, paslanmaz, solmaz.\nHer gün tak, her gün şık görün.'}
        </p>
        <div
          className="flex items-center gap-6 mt-8 hero-line"
          style={{ '--hero-delay': '210ms' } as React.CSSProperties}
        >
          <Link
            href="/urunler"
            className="inline-flex items-center bg-ink text-bg text-[11px] uppercase tracking-[0.15em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-all duration-300"
          >
            {c.hero_cta || 'Koleksiyonu Keşfet'}
          </Link>
          {/* Yeterli onaylı yorum varsa CTA "Çok Beğenilenler"e döner */}
          <Link
            href={hasMostLoved ? '/#cok-begenilenler' : '/#one-cikanlar'}
            className="text-accent text-[11px] uppercase tracking-widest font-body underline underline-offset-4 hover:text-accent/70 transition-colors"
          >
            {hasMostLoved ? 'Çok Beğenilenler →' : 'Öne Çıkanlar →'}
          </Link>
        </div>
      </div>

      {/* Sağ: Görsel Grid — ölçek girişi + ince parallax */}
      <HeroGrid
        items={heroItems}
        singleMode={singleMode}
        id="hero-media"
        className="hero-media hero-parallax"
      />
      <HeroParallax targetId="hero-media" />
    </section>
  )
}
