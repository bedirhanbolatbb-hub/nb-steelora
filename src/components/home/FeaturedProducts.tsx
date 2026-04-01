import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import ProductGrid from '@/components/store/ProductGrid'

interface Props {
  title?: string
  subtitle?: string
}

export default async function FeaturedProducts({ title, subtitle }: Props = {}) {
  let products: any[] = []

  try {
    const service = createServiceClient()
    const supabase = await createClient()

    // homepage_settings'ten seçili ürünleri oku
    const { data: settings } = await service
      .from('homepage_settings')
      .select('product_ids')
      .eq('section', 'featured')
      .single()

    const ids = (settings?.product_ids as string[]) || []

    if (ids.length > 0) {
      // Admin seçtiyse — is_active filtresi YOK, kalıcı
      const { data } = await service
        .from('products')
        .select('*, display_title:trendyol_title, display_price:trendyol_price, display_images:trendyol_images')
        .in('id', ids)

      if (data && data.length > 0) {
        products = ids
          .map((id) => data.find((p: any) => p.id === id))
          .filter(Boolean)
      }
    }

    // Fallback: admin hiç seçmediyse son 4 aktif ürün
    if (products.length === 0) {
      const { data } = await supabase
        .from('products_display')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4)

      if (data && data.length > 0) {
        products = data
      }
    }
  } catch {
    // Boş göster
  }

  if (products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
      <div className="flex items-end justify-between mb-12">
        <h2 className="font-heading text-[32px] text-text-primary">
          {title || (<>Öne Çıkan <span className="italic text-gold">Parçalar</span></>)}
        </h2>
        {subtitle && <p className="text-[12px] font-body text-text-muted mt-1">{subtitle}</p>}
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
