import { createClient } from '@/lib/supabase/server'
import ProductGrid from '@/components/store/ProductGrid'

export default async function UrunlerPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products_display')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] text-text-primary mb-8">Tüm Ürünler</h1>
      {products && products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <p className="text-text-muted font-body text-sm">
          Henüz ürün eklenmemiş. İlk sync sonrası ürünler burada görünecek.
        </p>
      )}
    </div>
  )
}
