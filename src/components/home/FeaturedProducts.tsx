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

    const { data } = await supabase
      .from('products_display')
      .select('*')
      .order('created_at', { ascending: false })

    products = data || []

    // Apply featured_order from site_content if present
    const c = await getSiteContent()
    if (c.featured_order) {
      try {
        const order: string[] = JSON.parse(c.featured_order)
        if (order.length > 0) {
          const map = new Map(products.map((p: any) => [p.id, p]))
          const prioritized = order.map((id) => map.get(id)).filter(Boolean)
          const rest = products.filter((p: any) => !order.includes(p.id))
          products = [...prioritized, ...rest]
        }
      } catch { /* ignore malformed JSON */ }
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
