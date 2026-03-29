import { createClient } from '@/lib/supabase/server'
import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import BrandBanner from '@/components/home/BrandBanner'
import Newsletter from '@/components/home/Newsletter'

export default async function HomePage() {
  let activeCampaign: any = null

  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .in('type', ['cart_discount', 'free_shipping', 'discount_code'])
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    activeCampaign = data
  } catch {
    // No active campaign
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
      <BrandBanner />
      <Newsletter />
    </>
  )
}
