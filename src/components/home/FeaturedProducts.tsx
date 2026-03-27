import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductGrid from '@/components/store/ProductGrid'
import type { Product } from '@/types'

// Supabase'de ürün yokken gösterilecek placeholder'lar
const placeholderProducts: Product[] = Array.from({ length: 4 }, (_, i) => ({
  id: `placeholder-${i + 1}`,
  slug: `urun-${i + 1}`,
  trendyol_id: `T${i + 1}`,
  trendyol_title: ['Altın Kaplama Zincir Kolye', 'Minimal Halka Küpe', 'İnce Taşlı Yüzük', 'Çoklu Zincir Bileklik'][i],
  trendyol_description: '',
  trendyol_price: [349, 199, 279, 249][i],
  trendyol_stock: 10,
  trendyol_images: [],
  trendyol_category: ['Kolye', 'Küpe', 'Yüzük', 'Bileklik'][i],
  trendyol_barcode: '',
  override_title: null,
  override_description: null,
  override_price: null,
  override_images: null,
  display_title: ['Altın Kaplama Zincir Kolye', 'Minimal Halka Küpe', 'İnce Taşlı Yüzük', 'Çoklu Zincir Bileklik'][i],
  display_price: [349, 199, 279, 249][i],
  display_images: [],
  collection_id: null,
  is_active: true,
  is_featured: true,
  badge: [null, 'new', 'bestseller', null][i] as Product['badge'],
  created_at: '',
  updated_at: '',
  last_synced_at: '',
}))

export default async function FeaturedProducts() {
  let products: Product[] = placeholderProducts

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products_display')
      .select('*')
      .eq('is_featured', true)
      .limit(4)

    if (data && data.length > 0) {
      products = data
    }
  } catch {
    // Supabase bağlantısı yoksa placeholder göster
  }

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
