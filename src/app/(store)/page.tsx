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
      <Marquee />
      <CategoryGrid />

      {activeCampaign && (
        <div className="bg-dark text-champagne text-center py-4 px-8">
          <p className="font-heading text-[20px] font-light">
            {activeCampaign.type === 'discount_code' &&
              `🎁 ${activeCampaign.name} — Kod: ${activeCampaign.code}`}
            {activeCampaign.type === 'cart_discount' &&
              `✨ ${activeCampaign.name}`}
            {activeCampaign.type === 'free_shipping' &&
              `🚚 ${activeCampaign.name}`}
          </p>
          {activeCampaign.ends_at && (
            <p className="text-[11px] text-text-muted font-body mt-1">
              {new Date(activeCampaign.ends_at).toLocaleDateString('tr-TR')} tarihine kadar geçerli
            </p>
          )}
        </div>
      )}

      <FeaturedProducts />
      <BrandBanner />
      <Newsletter />
    </>
  )
}
