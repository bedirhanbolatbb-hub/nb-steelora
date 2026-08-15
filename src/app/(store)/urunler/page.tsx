import { createClient } from '@/lib/supabase/server'
import ProductsClient from '@/components/store/ProductsClient'
import { LISTING_COLUMNS, PER_PAGE, paginateGroupedProducts } from '@/lib/catalog/listing'
import { getSiteContent } from '@/lib/supabase/content'

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const icerik = await getSiteContent()

  // Sayfalama gruplandıktan sonra uygulanır — bkz. lib/catalog/listing.ts
  let query = supabase
    .from('products_display')
    .select(LISTING_COLUMNS)

  // Kategori filtresi
  if (params.kategori) {
    query = query.ilike('trendyol_category', `%${params.kategori}%`)
  }

  // Fiyat aralığı
  if (params.min_fiyat) {
    query = query.gte('display_price', parseFloat(params.min_fiyat))
  }
  if (params.max_fiyat) {
    query = query.lte('display_price', parseFloat(params.max_fiyat))
  }

  // Stok filtresi
  if (params.stok === '1') {
    query = query.gt('trendyol_stock', 0)
  }

  // Sıralama
  switch (params.siralama) {
    case 'fiyat-artan':
      query = query.order('display_price', { ascending: true })
      break
    case 'fiyat-azalan':
      query = query.order('display_price', { ascending: false })
      break
    case 'yeni':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  }

  const sayfa = parseInt(params.sayfa || '1')
  const { data: products } = await query
  const { cards, total } = paginateGroupedProducts((products || []) as any[], sayfa)

  // Kategorileri al
  const { data: categoryData } = await supabase
    .from('products_display')
    .select('trendyol_category')
    .not('trendyol_category', 'is', null)

  const categories = [
    ...new Set(
      categoryData?.map((p) => p.trendyol_category).filter(Boolean) || []
    ),
  ]

  return (
    <ProductsClient
      cards={cards}
      total={total}
      categories={categories}
      currentPage={sayfa}
      perPage={PER_PAGE}
      currentParams={{
        kategori: params.kategori || '',
        siralama: params.siralama || '',
        min_fiyat: params.min_fiyat || '',
        max_fiyat: params.max_fiyat || '',
        stok: params.stok || '',
      }}
      tanitim={icerik['kategori_tanitim_tum-urunler'] || undefined}
    />
  )
}
