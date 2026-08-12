import { fetchApprovedProducts, fetchStockAndPriceMap } from './client'
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

type VariantRow = {
  barcode: string
  variantId: string
  title: string
  description: string
  images: string[]
  category: string | null
}

/**
 * V2 content listesini ürün-başına-satır yapımıza düzleştirir.
 * Bir content altındaki her variant ayrı satırdır; satır anahtarı barkoddur.
 * Arşivli / satışta olmayan varyantlar atlanır (V1'deki onSale filtresinin karşılığı).
 */
function flattenContents(contents: any[]): VariantRow[] {
  const rows: VariantRow[] = []

  for (const content of contents) {
    const images = (content.images || [])
      .map((img: any) => img?.url || img)
      .filter(Boolean)

    for (const variant of content.variants || []) {
      if (!variant?.barcode) continue
      if (variant.archived || variant.onSale === false) continue

      rows.push({
        barcode: variant.barcode,
        variantId: String(variant.variantId ?? ''),
        title: content.title || '',
        description: content.description || '',
        images,
        category: content.category?.name ?? null,
      })
    }
  }

  return rows
}

export async function syncTrendyolPage(page: number, size = 100) {
  const supabase = getServiceClient()

  // Sayfa 0 ise tüm ürünleri pasife çek
  if (page === 0) {
    console.log('Sync başlıyor: tüm ürünler pasife çekiliyor...')
    await supabase
      .from('products')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')
  }

  const data = await fetchApprovedProducts(page, size)
  const contents = data.content || []
  const totalElements = data.totalElements || 0
  const totalPages = data.totalPages || Math.ceil(totalElements / size) || 1

  const rows = flattenContents(contents)
  console.log(
    `Sync sayfa ${page}/${totalPages}: ${contents.length} content → ${rows.length} varyant (toplam content: ${totalElements})`
  )

  // Stok ve fiyat yalnızca inventory-and-price ucunda dönüyor.
  const stockMap = await fetchStockAndPriceMap(rows.map((r) => r.barcode))

  // Sayfadaki barkodların mevcut satırlarını tek sorguda al.
  const { data: existingRows } = await supabase
    .from('products')
    .select('id, trendyol_barcode')
    .in('trendyol_barcode', rows.map((r) => r.barcode))

  const existingByBarcode = new Map(
    (existingRows || []).map((r: any) => [r.trendyol_barcode, r.id])
  )

  let added = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const inventory = stockMap.get(row.barcode)

    // Stok/fiyat alınamadıysa satıra dokunma: eksik veri 0 olarak yazılmaz.
    if (!inventory) {
      skipped++
      console.warn(`Stok/fiyat alınamadı, atlandı: ${row.barcode}`)
      continue
    }

    const syncedFields = {
      trendyol_title: row.title,
      trendyol_description: row.description,
      trendyol_price: inventory.salePrice,
      trendyol_stock: inventory.quantity,
      trendyol_images: row.images,
      trendyol_category: row.category,
      trendyol_barcode: row.barcode,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    }

    const existingId = existingByBarcode.get(row.barcode)

    if (existingId) {
      // trendyol_id'ye dokunulmaz: mevcut satırların dış referansı korunur.
      await supabase
        .from('products')
        .update({ ...syncedFields, updated_at: new Date().toISOString() })
        .eq('id', existingId)

      updated++
    } else {
      await supabase.from('products').insert({
        ...syncedFields,
        trendyol_id: row.variantId,
        slug: generateSlug(row.title, row.barcode),
        is_featured: false,
      })

      added++
    }
  }

  const done = contents.length < size || page >= totalPages - 1

  console.log(
    `Sayfa ${page} tamamlandı: +${added} eklendi, ${updated} güncellendi, ${skipped} atlandı, done=${done}`
  )

  // Son sayfa ise sync log yaz
  if (done) {
    await supabase.from('sync_log').insert({
      products_updated: updated,
      products_added: added,
      status: skipped > 0 ? 'partial' : 'success',
      error_message: skipped > 0 ? `${skipped} varyant stok/fiyat alınamadığı için atlandı` : null,
    })
  }

  return { page, added, updated, skipped, totalPages, totalElements, done }
}
