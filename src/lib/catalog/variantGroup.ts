import { createClient } from '@/lib/supabase/server'
import { getGroupKey, hasDistinctLabels, pickCover } from './variants'

export type VariantMember = {
  id: string
  slug: string
  display_title: string
  display_images: string[] | null
  trendyol_stock: number | null
  variant_label: string | null
  created_at: string | null
}

/** Grup sorgusunun okuduğu alanlar — gruplama anahtarı + kapak kuralı için gerekli. */
const GRUP_ALANLARI =
  'id, slug, display_title, display_images, display_price, trendyol_stock, trendyol_category, gender, created_at, variant_label'

/**
 * Ürünün grup üyelerini tek sorguda getirir.
 * Önce ucuz eşitliklerle aday kümesi, sonra normalize başlıkla kesin eşleşme.
 */
async function grupUyeleri(product: any): Promise<any[]> {
  const supabase = await createClient()

  let query = supabase
    .from('products_display')
    .select(GRUP_ALANLARI)
    .eq('display_price', product.display_price)

  query = product.trendyol_category
    ? query.eq('trendyol_category', product.trendyol_category)
    : query.is('trendyol_category', null)

  query = product.gender ? query.eq('gender', product.gender) : query.is('gender', null)

  const { data: candidates } = await query

  const key = getGroupKey(product)
  return (candidates || []).filter((c: any) => getGroupKey(c) === key)
}

/**
 * Ürünün grubundaki üyeleri döner (başlık + kategori + fiyat + gender aynı).
 * PDP'de bir kez çağrılır; sonuç hem galeri altındaki küçük resim şeridi hem de
 * satın alma kolonundaki beden çipleri için kullanılır.
 */
export async function getVariantGroup(product: any): Promise<{
  members: VariantMember[]
  useLabels: boolean
}> {
  try {
    const members = (await grupUyeleri(product)).sort((a: any, b: any) => {
      const labelA = (a.variant_label ?? '').trim()
      const labelB = (b.variant_label ?? '').trim()
      if (labelA && labelB) return labelA.localeCompare(labelB, 'tr', { numeric: true })
      return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    }) as VariantMember[]

    if (members.length < 2) return { members: [], useLabels: false }

    return { members, useLabels: hasDistinctLabels(members) }
  } catch {
    return { members: [], useLabels: false }
  }
}

/**
 * Grubun canonical hedefi (Faz 18).
 *
 * Aynı başlık + kategori + fiyat + gender'a sahip kardeş sayfalar birbirinin
 * kopyası: başlık, açıklama ve fiyat birebir aynı. Search Console bu yüzden 46
 * sayfayı "kopya" diye eledi. Artık kardeşlerin hepsi grubun KAPAĞINI
 * gösteriyor; sayfalar erişilebilir kalıyor, yalnız indekslenecek tek adres
 * bildiriliyor.
 *
 * Hedef `pickCover` ile seçilir — sitemap ve vitrin kartıyla AYNI kural, yani
 * canonical her zaman gerçekten linklediğimiz adrese işaret eder.
 * Grup tek üyeliyse ya da sorgu düşerse ürünün kendi slug'ı döner.
 */
export async function getGroupCanonicalSlug(product: any): Promise<string> {
  const kendi = String(product?.slug ?? '')
  try {
    const members = await grupUyeleri(product)
    if (members.length < 2) return kendi
    return String(pickCover(members)?.slug ?? kendi) || kendi
  } catch {
    return kendi
  }
}
