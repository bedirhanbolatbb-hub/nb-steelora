/**
 * Ürün rozeti — kartta ve PDP'de TEK rozet basılır.
 *
 * Öncelik: "Son 1 adet" > elle girilmiş badge alanı > "Yeni".
 * "Yeni", ürünün kataloğa eklenme tarihine (created_at) bakar; uydurma bir
 * etiket değildir, son 14 gün içinde eklenen aktif ürünlerde çıkar.
 */
export const NEW_BADGE_DAYS = 14
export const LAST_ONE_STOCK = 1

export type ProductBadge = { label: string; tone: 'urgent' | 'custom' | 'new' }

/** Elle girilen bilinen anahtarların Türkçe karşılıkları; diğerleri olduğu gibi basılır. */
const KNOWN_BADGES: Record<string, string> = {
  new: 'Yeni',
  bestseller: 'Çok Satan',
  sale: 'İndirim',
}

export function resolveBadge(product: {
  trendyol_stock?: number | null
  badge?: string | null
  created_at?: string | null
}): ProductBadge | null {
  const stock = Number(product.trendyol_stock ?? 0)
  if (stock === LAST_ONE_STOCK) {
    return { label: 'Son 1 adet', tone: 'urgent' }
  }

  const custom = (product.badge ?? '').trim()
  if (custom) {
    return { label: KNOWN_BADGES[custom.toLowerCase()] ?? custom, tone: 'custom' }
  }

  if (product.created_at) {
    const ageMs = Date.now() - new Date(product.created_at).getTime()
    if (ageMs >= 0 && ageMs <= NEW_BADGE_DAYS * 24 * 60 * 60 * 1000) {
      return { label: 'Yeni', tone: 'new' }
    }
  }

  return null
}
