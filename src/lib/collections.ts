import { createClient } from '@/lib/supabase/server'
import { LISTING_COLUMNS } from '@/lib/catalog/listing'

/**
 * Küratörlü koleksiyonlar (collections tablosu).
 *
 * Üyelik tek kaynaktan gelir: collections.product_ids. products.collection_id
 * kolonu tabloda duruyor ama tamamen boş (520/520 null), bu yüzden hiç okunmaz.
 * Ürünler products_display üzerinden çekilir — o görünüm zaten is_active=true
 * filtresini içerdiği için pasife düşen ürün koleksiyonda listelenmez.
 *
 * Ad ve açıklama admin verisidir; kod bunları değiştirmez, çevirmez, kısaltmaz.
 * Anasayfa şeridinde yalnız GÖSTERİM sırasında ilk cümle alınır (bkz.
 * firstSentence) — veriye dokunulmaz.
 */
export type CollectionRow = {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  product_ids: string[] | null
}

export type CollectionCard = {
  slug: string
  name: string
  description: string | null
  cover: string | null
  productCount: number
}

/** Görsel: koleksiyonun kendi görseli, yoksa ilk aktif ürününün görseli. */
function coverFrom(collection: CollectionRow, byId: Map<string, any>): string | null {
  if (collection.image_url) return collection.image_url
  for (const id of collection.product_ids || []) {
    const image = byId.get(id)?.display_images?.[0]
    if (image) return image
  }
  return null
}

/** Şeritte tek cümle gösterilir; metin veritabanında olduğu gibi kalır. */
export function firstSentence(text: string | null): string {
  if (!text) return ''
  const match = text.match(/^[^.!?]+[.!?]/)
  return (match ? match[0] : text).trim()
}

/** Aktif koleksiyonlar, admin sırasıyla; kapak görseli ve aktif ürün sayısıyla. */
export async function getCollectionCards(): Promise<CollectionCard[]> {
  try {
    const supabase = await createClient()
    const { data: collections } = await supabase
      .from('collections')
      .select('id, slug, name, description, image_url, product_ids')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (!collections?.length) return []

    const allIds = [...new Set(collections.flatMap((c: any) => c.product_ids || []))]
    let byId = new Map<string, any>()

    if (allIds.length > 0) {
      const { data: products } = await supabase
        .from('products_display')
        .select('id, display_images')
        .in('id', allIds)
      byId = new Map((products || []).map((p: any) => [p.id, p]))
    }

    return (collections as CollectionRow[]).map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      cover: coverFrom(c, byId),
      productCount: (c.product_ids || []).filter((id) => byId.has(id)).length,
    }))
  } catch {
    // Koleksiyonlar alınamazsa şerit ve footer bağlantıları basılmaz.
    return []
  }
}

/** Tek koleksiyon + üyeleri (admin sırasında, yalnız aktif olanlar). */
export async function getCollection(
  slug: string
): Promise<{ collection: CollectionRow; products: any[]; cover: string | null } | null> {
  const supabase = await createClient()

  const { data: collection } = await supabase
    .from('collections')
    .select('id, slug, name, description, image_url, product_ids')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!collection) return null

  const ids = (collection as CollectionRow).product_ids || []
  if (ids.length === 0) {
    return { collection: collection as CollectionRow, products: [], cover: collection.image_url }
  }

  const { data } = await supabase
    .from('products_display')
    .select(LISTING_COLUMNS)
    .in('id', ids)

  const byId = new Map((data || []).map((p: any) => [p.id, p]))
  // Admin'in dizdiği sıra korunur.
  const products = ids.map((id) => byId.get(id)).filter(Boolean)

  return {
    collection: collection as CollectionRow,
    products,
    cover: coverFrom(collection as CollectionRow, byId),
  }
}
