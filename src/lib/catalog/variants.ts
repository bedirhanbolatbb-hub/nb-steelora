/**
 * Varyant gruplama — yalnızca görüntüleme katmanı.
 * DB'de grup tablosu yok; gruplar her istekte ürün alanlarından türetilir.
 * Ürün slug/URL'leri, sepete eklenen id ve feed etkilenmez.
 *
 * Grup anahtarı: normalize(görünen başlık) + kategori + fiyat + gender.
 * Dördü de aynı olmayan ürünler ayrı kart kalır — farklı fiyatlı aynı-başlık
 * grupları (ör. "Erkek Çelik Bileklik 19 cm") bu yüzden gruplanmaz.
 */

export type GroupableProduct = {
  id: string
  slug?: string | null
  display_title?: string | null
  display_price?: number | string | null
  trendyol_category?: string | null
  trendyol_stock?: number | null
  gender?: string | null
  created_at?: string | null
  variant_label?: string | null
  [key: string]: unknown
}

export type ProductGroup<T extends GroupableProduct = GroupableProduct> = {
  key: string
  cover: T
  members: T[]
  /** Kapak dışındaki üye sayısı — kartta "+N seçenek" olarak basılır. */
  optionCount: number
}

/** trim + Türkçe-duyarlı küçük harf + çoklu boşluğu tekle. */
export function normalizeTitle(title: string | null | undefined): string {
  return (title ?? '')
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function getGroupKey(product: GroupableProduct): string {
  const title = normalizeTitle(product.display_title as string)
  const category = (product.trendyol_category ?? '').trim()
  const price = Number(product.display_price ?? 0).toFixed(2)
  const gender = product.gender ?? ''
  return `${title}|${category}|${price}|${gender}`
}

/** Kapak: stoğu en yüksek üye, eşitlikte en yeni (created_at). */
function compareForCover(a: GroupableProduct, b: GroupableProduct): number {
  const stockDiff = (Number(b.trendyol_stock) || 0) - (Number(a.trendyol_stock) || 0)
  if (stockDiff !== 0) return stockDiff
  return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
}

/**
 * Ürün listesini gruplar. Grupların sırası, girdideki ilk üyenin sırasıdır —
 * böylece sayfanın mevcut sıralaması (fiyat, tarih vb.) korunur.
 */
export function groupProducts<T extends GroupableProduct>(products: T[]): ProductGroup<T>[] {
  const groups = new Map<string, T[]>()

  for (const product of products) {
    const key = getGroupKey(product)
    const bucket = groups.get(key)
    if (bucket) bucket.push(product)
    else groups.set(key, [product])
  }

  return [...groups.entries()].map(([key, members]) => {
    const sorted = [...members].sort(compareForCover)
    return {
      key,
      cover: sorted[0],
      members: sorted,
      optionCount: sorted.length - 1,
    }
  })
}

/** Etiket çipi yalnız üyeleri ayırt eden bir variant_label varsa gösterilir. */
export function hasDistinctLabels(members: GroupableProduct[]): boolean {
  const labels = members.map((m) => (m.variant_label ?? '').trim()).filter(Boolean)
  return labels.length === members.length && new Set(labels).size > 1
}
