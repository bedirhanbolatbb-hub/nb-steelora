import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSiteContent } from '@/lib/supabase/content'
import { getHomepageSection, getHeroProducts, ShownProducts } from '@/lib/home/sections'
import { getCollectionCards } from '@/lib/collections'
import HeroCinema from '@/components/home/HeroCinema'
import PromoStrip from '@/components/home/PromoStrip'
import CategoryRail from '@/components/home/CategoryRail'
import CollectionsBand from '@/components/home/CollectionsBand'
import GiftSplit from '@/components/home/GiftSplit'
import WhyUs from '@/components/home/WhyUs'
import BlogPreview from '@/components/home/BlogPreview'
import Newsletter from '@/components/home/Newsletter'
import ProductCardV2 from '@/components/store/ProductCardV2'
import JsonLd from '@/components/seo/JsonLd'
import { getBlurDataURL } from '@/lib/blur'
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo'

/**
 * Anasayfa v2 — "Sessiz Atölye" (Faz 8B). 10 bant:
 * hero · promo · kategoriler · öne çıkanlar (editorial) · koleksiyonlar ·
 * yeni gelenler (rail) · hediye · neden · blog · bülten.
 * Tekilleştirme kuralı korunur: hero > featured > new_arrivals — hiçbir ürün
 * (ya da grup kardeşi) iki bölümde birden basılmaz.
 */
export default async function HomePage() {
  let activeCampaign: any = null
  const c = await getSiteContent()

  // Hero: Kürasyon'daki hero_top ürünü — görseli banda, kendisi tekilleştirmeye
  const heroProducts = await getHeroProducts()
  const heroProduct = heroProducts[0] ?? null
  const heroImage = (heroProduct?.display_images as string[] | null)?.[0] ?? null
  const heroBlur = heroImage ? await getBlurDataURL(heroImage) : undefined

  const shown = new ShownProducts()
  shown.add(heroProducts)

  const featured = await getHomepageSection('featured', shown)
  shown.add(featured)

  const newArrivals = await getHomepageSection('new_arrivals', shown)

  const collections = await getCollectionCards()

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    activeCampaign = campaignData
  } catch {
    // Kampanya yoksa şerit basılmaz
  }

  const buyukler = featured.slice(0, 2)
  const standartlar = featured.slice(2, 8)

  return (
    <>
      <JsonLd data={organizationJsonLd([c.instagram_url, c.facebook_url, c.x_url])} />
      <JsonLd data={websiteJsonLd()} />

      {/* 1 · Hero — full-bleed sinema karesi */}
      <HeroCinema c={c} image={heroImage} imageHref={heroProduct ? `/urun/${heroProduct.slug}` : null} blur={heroBlur} />

      {/* 2 · Promo şeridi — Inter, emojisiz, ince altın çizgi */}
      <PromoStrip campaign={activeCampaign} />

      {/* 3 · Kategoriler — yatay şerit */}
      <CategoryRail />

      {/* 4 · Öne Çıkanlar — editorial karma: 2 büyük + 6 standart */}
      {featured.length > 0 && (
        <section id="one-cikanlar" className="max-w-[1400px] mx-auto px-4 lg:px-8 pb-16 lg:pb-20">
          <div className="mb-8 text-center" data-reveal>
            <p className="eyebrow">Seçki</p>
            <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
              {c.featured_title || 'Öne Çıkanlar'}
            </h2>
            {c.featured_subtitle && (
              <p className="text-[12px] font-body text-muted mt-1.5">{c.featured_subtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {buyukler.map((product: any, i: number) => (
              <div key={product.id} data-reveal style={{ '--reveal-delay': `${i * 60}ms` } as React.CSSProperties}>
                <ProductCardV2 product={product} priority buyuk />
              </div>
            ))}
          </div>

          {standartlar.length > 0 && (
            <div className="mt-4 lg:mt-6 grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {standartlar.map((product: any, i: number) => (
                <div key={product.id} data-reveal style={{ '--reveal-delay': `${(i % 3) * 50}ms` } as React.CSSProperties}>
                  <ProductCardV2 product={product} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5 · Koleksiyonlar — full-bleed koyu bant */}
      <CollectionsBand collections={collections} />

      {/* 6 · Yeni Gelenler — peek'li yatay rail */}
      {newArrivals.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="mb-8 flex items-end justify-between" data-reveal>
            <div>
              <p className="eyebrow">Taze</p>
              <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">
                {c.new_arrivals_title || 'Yeni Gelenler'}
              </h2>
            </div>
            <Link
              href="/urunler?siralama=yeni"
              className="hidden sm:block text-[11px] uppercase tracking-[0.16em] font-body font-medium text-ink border-b border-accent pb-0.5 hover:text-accent-deep transition-colors"
            >
              Tümünü Gör →
            </Link>
          </div>

          {/* Rail kendi kabında kayar; son kart "peek" ile devamı sezdirir */}
          <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex gap-4 lg:gap-5 snap-x snap-mandatory">
              {newArrivals.map((product: any, i: number) => (
                <div
                  key={product.id}
                  className="w-[68vw] sm:w-[280px] shrink-0 snap-start"
                  data-reveal
                  style={{ '--reveal-delay': `${(i % 4) * 40}ms` } as React.CSSProperties}
                >
                  <ProductCardV2 product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7 · Hediye — full-bleed split */}
      <GiftSplit />

      {/* 8 · Neden NB Steelora — 4 sütun ikonlu */}
      <WhyUs />

      {/* 9 · Blog önizleme */}
      <BlogPreview />

      {/* 10 · Bülten */}
      <Newsletter />
    </>
  )
}
