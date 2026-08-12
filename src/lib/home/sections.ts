import { createClient } from '@/lib/supabase/server'

// Anasayfadaki hiçbir bölüm bu sayıdan fazla kart basmaz.
export const MAX_SECTION_ITEMS = 12

// Küratörlü liste boş/geçersizse gösterilecek ürün sayısı.
export const FALLBACK_SECTION_ITEMS = 8

export type HomepageSection = 'featured' | 'new_arrivals'

/**
 * homepage_settings tablosundaki küratörlü listeyi okur ve sırasını koruyarak döner.
 * products_display view'u yalnızca is_active = true satırları içerir, bu yüzden
 * pasife çekilmiş ürünler listede yer alsa bile ekrana basılmaz.
 * Liste boş, geçersiz veya tamamı pasifse: en son eklenen aktif ürünlere düşer.
 */
export async function getHomepageSection(section: HomepageSection): Promise<any[]> {
  try {
    const supabase = await createClient()

    const { data: settings } = await supabase
      .from('homepage_settings')
      .select('product_ids')
      .eq('section', section)
      .maybeSingle()

    const curatedIds = ((settings?.product_ids as string[] | null) || [])
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .slice(0, MAX_SECTION_ITEMS)

    if (curatedIds.length > 0) {
      const { data } = await supabase
        .from('products_display')
        .select('*')
        .in('id', curatedIds)

      if (data && data.length > 0) {
        const byId = new Map(data.map((p: any) => [p.id, p]))
        const ordered = curatedIds.map((id) => byId.get(id)).filter(Boolean)
        if (ordered.length > 0) return ordered.slice(0, MAX_SECTION_ITEMS)
      }
    }

    const { data: fallback } = await supabase
      .from('products_display')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(FALLBACK_SECTION_ITEMS)

    return (fallback || []).slice(0, MAX_SECTION_ITEMS)
  } catch {
    return []
  }
}
