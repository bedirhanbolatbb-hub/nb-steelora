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

export async function syncTrendyolProducts() {
  const supabase = getServiceClient()
  const startTime = Date.now()

  let productsAdded = 0
  let productsUpdated = 0
  let errorMessage: string | null = null

  try {
    let page = 0
    const size = 50

    while (true) {
      const data = await fetchTrendyolProducts(page, size)
      const products = data.content || []

      if (products.length === 0) break

      console.log(`Sync sayfa ${page}: ${products.length} ürün çekiliyor (toplam: ${data.totalElements || '?'})`)

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
                updated_at: new Date().toISOString(),
                last_synced_at: new Date().toISOString(),
              })
              .eq('trendyol_id', trendyolId)

            productsUpdated++
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

            productsAdded++
          }
        }
      }

      console.log(`Sayfa ${page} tamamlandı: +${productsAdded} eklendi, ${productsUpdated} güncellendi`)

      if (products.length < size || page >= (data.totalPages - 1)) break
      page++
    }
  } catch (error: any) {
    errorMessage = error.message
    console.error('Sync error:', error)
  }

  const supabaseLog = getServiceClient()
  await supabaseLog.from('sync_log').insert({
    products_updated: productsUpdated,
    products_added: productsAdded,
    status: errorMessage ? 'error' : 'success',
    error_message: errorMessage,
  })

  return {
    success: !errorMessage,
    productsAdded,
    productsUpdated,
    duration: Date.now() - startTime,
    error: errorMessage,
  }
}
