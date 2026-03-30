import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductGrid from '@/components/store/ProductGrid'

export default async function FeaturedProducts() {
  let products: any[] = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products_display')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4)

    if (data && data.length > 0) {
      products = data
    }
  } catch {
    // Supabase bağlantısı yoksa boş göster
  }

  if (products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-12">
        <h2 className="font-heading text-[32px] text-text-primary">
          Öne Çıkan <span className="italic text-gold">Parçalar</span>
        </h2>
        <Link
          href="/urunler"
          className="text-[11px] uppercase tracking-[0.15em] font-body text-gold hover:text-gold-light transition-colors hidden sm:block"
        >
          Tümünü Gör →
        </Link>
      </div>
      <ProductGrid products={products} columns={4} />
      <div className="mt-8 text-center sm:hidden">
        <Link
          href="/urunler"
          className="text-[11px] uppercase tracking-[0.15em] font-body text-gold hover:text-gold-light transition-colors"
        >
          Tümünü Gör →
        </Link>
      </div>
    </section>
  )
}
