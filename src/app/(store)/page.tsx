import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSiteContent } from '@/lib/supabase/content'
import { getHomepageSection } from '@/lib/home/sections'
import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import BrandBanner from '@/components/home/BrandBanner'
import Newsletter from '@/components/home/Newsletter'
import ProductCard from '@/components/store/ProductCard'

export default async function HomePage() {
  let activeCampaign: any = null
  const c = await getSiteContent()

  // Küratörlü liste: homepage_settings(section='new_arrivals').product_ids
  const newArrivals = await getHomepageSection('new_arrivals')

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Campaign — tüm aktif kampanya tipleri
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
    // Defaults apply
  }

  return (
    <>
      <Hero />

      {c.promo_bar_text && (
        <div className="bg-champagne-mid border-b border-champagne-dark py-2.5 px-8 text-center">
          <p className="text-[11px] font-body text-text-primary uppercase tracking-[0.15em]">
            {c.promo_bar_emoji && <span className="mr-2">{c.promo_bar_emoji}</span>}
            {c.promo_bar_text}
          </p>
        </div>
      )}

      {activeCampaign && (
        <div
          className="border-y border-gold/20 py-5 px-8 text-center"
          style={{ background: activeCampaign.banner_color ? activeCampaign.banner_color : 'linear-gradient(135deg, #2A1E1E 0%, #4A2828 50%, #2A1E1E 100%)' }}
        >
          <p className="font-heading text-[24px] text-white font-light mb-1">
            {activeCampaign.type === 'discount_code' && `🎁 ${activeCampaign.name}`}
            {activeCampaign.type === 'cart_discount' && `✨ ${activeCampaign.name}`}
            {activeCampaign.type === 'free_shipping' && `🚚 ${activeCampaign.name}`}
            {activeCampaign.type === 'buy_x_get_y' && `🎀 ${activeCampaign.name}`}
            {activeCampaign.type === 'banner' && (activeCampaign.banner_text || activeCampaign.name)}
          </p>
          {activeCampaign.type === 'discount_code' && activeCampaign.code && (
            <p className="text-[11px] tracking-[0.2em] uppercase font-body" style={{ color: '#C89080' }}>
              Kod: {activeCampaign.code} — Sepete ekle, indirimi uygula
            </p>
          )}
          {activeCampaign.type === 'buy_x_get_y' && activeCampaign.metadata && (
            <p className="text-[11px] tracking-[0.15em] uppercase font-body" style={{ color: '#C89080' }}>
              {activeCampaign.metadata.buy_quantity} al, {activeCampaign.metadata.pay_quantity} öde
            </p>
          )}
          {activeCampaign.ends_at && (
            <p className="text-[10px] text-white/40 font-body mt-1.5">
              {new Date(activeCampaign.ends_at).toLocaleDateString('tr-TR')} tarihine kadar geçerli
            </p>
          )}
        </div>
      )}

      <Marquee />
      <CategoryGrid />
      <FeaturedProducts title={c.featured_title} subtitle={c.featured_subtitle} />

      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-heading text-[32px] text-text-primary">
                {c.new_arrivals_title || (<>Yeni <span className="italic text-gold">Gelenler</span></>)}
              </h2>
              {c.new_arrivals_subtitle && (
                <p className="text-[12px] font-body text-text-muted mt-1">{c.new_arrivals_subtitle}</p>
              )}
            </div>
            <Link
              href="/urunler?siralama=yeni"
              className="text-[11px] uppercase tracking-[0.15em] font-body text-text-muted hover:text-gold transition-colors hidden sm:block"
            >
              Tümünü Gör →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {newArrivals.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Neden NB Steelora — metinler mevcut site içeriğinden derlendi:
          316L ifadesi Hero açıklamasından, kargo eşiği sepet/hakkımızda sayfasından,
          iade süresi hakkımızda sayfasından, hediye paketi BrandBanner'dan. */}
      <section className="bg-champagne-dark py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-heading text-[32px] text-text-primary">
              Neden <span className="italic text-gold">NB Steelora?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: '316L Medikal Çelik', text: 'Kararmaz, paslanmaz, solmaz. Her gün tak, her gün şık görün.' },
              { title: 'Ücretsiz Kargo', text: '500₺ üzeri siparişlerde kargo bizden. 1-5 iş günü içinde teslimat.' },
              { title: 'Kolay İade', text: 'Koşulsuz 14 gün iade hakkı.' },
              { title: 'Özel Hediye Paketi', text: 'Her sipariş için ücretsiz premium hediye kutusu.' },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-champagne-mid rounded-lg p-6 flex flex-col gap-3">
                <h3 className="text-[11px] font-body uppercase tracking-[0.15em] text-gold">
                  {item.title}
                </h3>
                <p className="text-[13px] font-body text-text-secondary leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BrandBanner />
      <Newsletter />
    </>
  )
}
