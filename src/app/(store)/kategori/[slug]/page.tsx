import { createClient } from '@/lib/supabase/server'
import ProductsClient from '@/components/store/ProductsClient'
import { notFound } from 'next/navigation'
import { buildCategoryFilter, getCategory } from '@/lib/catalog/categories'
import { LISTING_COLUMNS, PER_PAGE, paginateGroupedProducts } from '@/lib/catalog/listing'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo'

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

  // Gruplama görüntüleme katmanında yapıldığı için sayfalama sunucuda değil,
  // gruplandıktan sonra uygulanır; eşleşen tüm satırlar hafif kolonlarla çekilir.
  let query = supabase.from('products_display').select(LISTING_COLUMNS)
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
  const { data: products } = await query
  const { cards, total } = paginateGroupedProducts((products || []) as any[], sayfa)

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ürünler', path: '/urunler' },
          { name: kategori, path: `/kategori/${slug}` },
        ])}
      />
      <ProductsClient
      cards={cards}
      total={total}
      categories={[kategori]}
      currentPage={sayfa}
      perPage={PER_PAGE}
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
    </>
  )
}
