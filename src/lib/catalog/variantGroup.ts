import { createClient } from '@/lib/supabase/server'
import { getGroupKey, hasDistinctLabels } from './variants'

export type VariantMember = {
  id: string
  slug: string
  display_title: string
  display_images: string[] | null
  trendyol_stock: number | null
  variant_label: string | null
  created_at: string | null
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
    const supabase = await createClient()

    // Önce ucuz eşitliklerle aday kümesi, sonra normalize başlıkla kesin eşleşme.
    let query = supabase
      .from('products_display')
      .select(
        'id, slug, display_title, display_images, display_price, trendyol_stock, trendyol_category, gender, created_at, variant_label'
      )
      .eq('display_price', product.display_price)

    query = product.trendyol_category
      ? query.eq('trendyol_category', product.trendyol_category)
      : query.is('trendyol_category', null)

    query = product.gender ? query.eq('gender', product.gender) : query.is('gender', null)

    const { data: candidates } = await query

    const key = getGroupKey(product)
    const members = (candidates || [])
      .filter((c: any) => getGroupKey(c) === key)
      .sort((a: any, b: any) => {
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
