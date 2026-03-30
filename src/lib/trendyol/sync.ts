import { fetchTrendyolProducts } from './client'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateSlug(title: string, barcode: string): string {
  const base = title
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  return `${base}-${barcode.slice(-6)}`
}

export async function syncTrendyolPage(page: number, size = 50) {
  const supabase = getServiceClient()

  // Sayfa 0 ise tüm ürünleri pasife çek
  if (page === 0) {
    console.log('Sync başlıyor: tüm ürünler pasife çekiliyor...')
    await supabase
      .from('products')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')
  }

  const data = await fetchTrendyolProducts(page, size)
  const products = data.content || []
  const totalElements = data.totalElements || 0
  const totalPages = data.totalPages || Math.ceil(totalElements / size) || 1

  console.log(`Sync sayfa ${page}/${totalPages}: ${products.length} ürün (toplam: ${totalElements})`)

  let added = 0
  let updated = 0

  for (const product of products) {
    const variants = product.variants?.length ? product.variants : [product]

    for (const variant of variants) {
      const barcode = variant.barcode || product.barcode
      const stock = variant.quantity ?? product.quantity ?? 0
      const price = variant.salePrice ?? product.salePrice ?? 0
      const images = (product.images || []).map((img: any) => img.url || img)
      const trendyolId = String(product.id)

      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('trendyol_id', trendyolId)
        .single()

      if (existing) {
        await supabase
          .from('products')
          .update({
            trendyol_title: product.title,
            trendyol_description: product.description || '',
            trendyol_price: price,
            trendyol_stock: stock,
            trendyol_images: images,
            trendyol_category: product.categoryName,
            trendyol_barcode: barcode,
            is_active: true,
            updated_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          })
          .eq('trendyol_id', trendyolId)

        updated++
      } else {
        const slug = generateSlug(product.title, barcode)

        await supabase.from('products').insert({
          trendyol_id: trendyolId,
          slug,
          trendyol_title: product.title,
          trendyol_description: product.description || '',
          trendyol_price: price,
          trendyol_stock: stock,
          trendyol_images: images,
          trendyol_category: product.categoryName,
          trendyol_barcode: barcode,
          is_active: true,
          is_featured: false,
          last_synced_at: new Date().toISOString(),
        })

        added++
      }
    }
  }

  const done = products.length < size || page >= totalPages - 1

  console.log(`Sayfa ${page} tamamlandı: +${added} eklendi, ${updated} güncellendi, done=${done}`)

  // Son sayfa ise sync log yaz
  if (done) {
    await supabase.from('sync_log').insert({
      products_updated: updated,
      products_added: added,
      status: 'success',
      error_message: null,
    })
  }

  return { page, added, updated, totalPages, totalElements, done }
}
