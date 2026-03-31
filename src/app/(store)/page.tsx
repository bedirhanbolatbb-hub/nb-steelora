import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import BrandBanner from '@/components/home/BrandBanner'
import Newsletter from '@/components/home/Newsletter'
import ProductCard from '@/components/store/ProductCard'

export default async function HomePage() {
  let activeCampaign: any = null
  let newArrivals: any[] = []

  try {
    const supabase = await createClient()
    const service = createServiceClient()
    const now = new Date().toISOString()

    // Campaign
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .in('type', ['cart_discount', 'free_shipping', 'discount_code'])
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    activeCampaign = campaignData

    // New Arrivals — admin seçtiyse kalıcı, yoksa fallback
    const { data: naSettings } = await service
      .from('homepage_settings')
      .select('product_ids')
      .eq('section', 'new_arrivals')
      .single()

    const naIds = (naSettings?.product_ids as string[]) || []

    if (naIds.length > 0) {
      // Admin seçimi — is_active filtresi yok
      const { data } = await service
        .from('products')
        .select('*, display_title:trendyol_title, display_price:trendyol_price, display_images:trendyol_images')
        .in('id', naIds)
      if (data && data.length > 0) {
        newArrivals = naIds.map((id) => data.find((p: any) => p.id === id)).filter(Boolean)
      }
    }

    // Fallback: son 4 aktif ürün
    if (newArrivals.length === 0) {
      const { data } = await supabase
        .from('products_display')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4)
      newArrivals = data || []
    }
  } catch {
    // Defaults apply
  }

  return (
    <>
      <Hero />

      {activeCampaign && (
        <div
          className="border-y border-gold/20 py-5 px-8 text-center"
          style={{ background: 'linear-gradient(135deg, #2A1E1E 0%, #4A2828 50%, #2A1E1E 100%)' }}
        >
          <p className="font-heading text-[24px] text-white font-light mb-1">
            {activeCampaign.type === 'discount_code' &&
              `🎁 ${activeCampaign.name}`}
            {activeCampaign.type === 'cart_discount' &&
              `✨ ${activeCampaign.name}`}
            {activeCampaign.type === 'free_shipping' &&
              `🚚 ${activeCampaign.name}`}
          </p>
          {activeCampaign.type === 'discount_code' && activeCampaign.code && (
            <p className="text-[11px] tracking-[0.2em] uppercase font-body" style={{ color: '#C89080' }}>
              Kod: {activeCampaign.code} — Sepete ekle, indirimi uygula
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
      <FeaturedProducts />

      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-heading text-[32px] text-text-primary">
              Yeni <span className="italic text-gold">Gelenler</span>
            </h2>
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

      <BrandBanner />
      <Newsletter />
    </>
  )
}
