import { createClient } from '@/lib/supabase/server'
import ProductsClient from '@/components/store/ProductsClient'
import { notFound } from 'next/navigation'

const KATEGORI_MAP: Record<string, string> = {
  kolye: 'Kolye',
  kupe: 'Küpe',
  yuzuk: 'Yüzük',
  bileklik: 'Bileklik',
  setler: 'Set',
}

export default async function KategoriPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams

  const kategori = KATEGORI_MAP[slug]
  if (!kategori) notFound()

  const supabase = await createClient()

  let query = supabase
    .from('products_display')
    .select('*', { count: 'exact' })
    .ilike('trendyol_category', `%${kategori}%`)

  // Fiyat aralığı
  if (sp.min_fiyat) {
    query = query.gte('display_price', parseFloat(sp.min_fiyat))
  }
  if (sp.max_fiyat) {
    query = query.lte('display_price', parseFloat(sp.max_fiyat))
  }

  // Stok filtresi
  if (sp.stok === '1') {
    query = query.gt('trendyol_stock', 0)
  }

  // Sıralama
  switch (sp.siralama) {
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
      query = query.order('created_at', { ascending: false })
  }

  const sayfa = parseInt(sp.sayfa || '1')
  const perPage = 24
  const from = (sayfa - 1) * perPage
  query = query.range(from, from + perPage - 1)

  const { data: products, count } = await query

  return (
    <ProductsClient
      products={products || []}
      total={count || 0}
      categories={[kategori]}
      currentPage={sayfa}
      perPage={perPage}
      currentParams={{
        kategori,
        siralama: sp.siralama || '',
        min_fiyat: sp.min_fiyat || '',
        max_fiyat: sp.max_fiyat || '',
        stok: sp.stok || '',
      }}
      title={kategori}
    />
  )
}
