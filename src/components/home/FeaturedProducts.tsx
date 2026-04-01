import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSiteContent } from '@/lib/supabase/content'
import FeaturedCarousel from './FeaturedCarousel'

interface Props {
  title?: string
  subtitle?: string
}

export default async function FeaturedProducts({ title, subtitle }: Props = {}) {
  let products: any[] = []

  try {
    const supabase = await createClient()

    // Tüm aktif ürünleri çek — carousel için limit yok
    const { data } = await supabase
      .from('products_display')
      .select('*')
      .order('created_at', { ascending: false })

    products = data || []

    // Apply priority order: featured_order ids first, then homepage featured ids, then rest
    const c = await getSiteContent()
    let priorityIds: string[] = []

    if (c.featured_order) {
      try { priorityIds = JSON.parse(c.featured_order) } catch { /* ignore */ }
    }

    if (priorityIds.length === 0) {
      // Fallback priority: whatever admin pinned in homepage_settings
      const { data: settings } = await supabase
        .from('homepage_settings')
        .select('product_ids')
        .eq('section', 'featured')
        .single()
      priorityIds = (settings?.product_ids as string[]) || []
    }

    if (priorityIds.length > 0) {
      const map = new Map(products.map((p: any) => [p.id, p]))
      const prioritized = priorityIds.map((id) => map.get(id)).filter(Boolean)
      const rest = products.filter((p: any) => !priorityIds.includes(p.id))
      products = [...prioritized, ...rest]
    }
  } catch {
    // Boş göster
  }

  if (products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="font-heading text-[32px] text-text-primary">
            {title || (<>Öne Çıkan <span className="italic text-gold">Parçalar</span></>)}
          </h2>
          {subtitle && <p className="text-[12px] font-body text-text-muted mt-1">{subtitle}</p>}
        </div>
        <Link
          href="/urunler"
          className="text-[11px] uppercase tracking-[0.15em] font-body text-gold hover:text-gold-light transition-colors hidden sm:block"
        >
          Tümünü Gör →
        </Link>
      </div>
      <FeaturedCarousel products={products} />
    </section>
  )
}
