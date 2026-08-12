import { createClient } from '@/lib/supabase/server'
import ProductsClient from '@/components/store/ProductsClient'
import { notFound } from 'next/navigation'
import { buildCategoryFilter, getCategory } from '@/lib/catalog/categories'

export default async function KategoriPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams

  const def = getCategory(slug)
  if (!def) notFound()

  const kategori = def.title
  const supabase = await createClient()

  const filter = buildCategoryFilter(def, sp.tip)

  let query = supabase.from('products_display').select('*', { count: 'exact' })
  query =
    filter.kind === 'eq'
      ? query.eq(filter.column, filter.value)
      : query.or(filter.expression)

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
        tip: sp.tip || '',
      }}
      title={kategori}
      chips={def.chips?.map((c) => ({ value: c.value, label: c.label }))}
    />
  )
}
