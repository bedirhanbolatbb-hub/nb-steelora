import { createClient } from '@/lib/supabase/server'

// Anasayfadaki hiçbir bölüm bu sayıdan fazla kart basmaz.
export const MAX_SECTION_ITEMS = 12

// Küratörlü liste kısa kaldığında bölümün tamamlanacağı ürün sayısı.
export const TARGET_SECTION_ITEMS = 8

export type HomepageSection = 'featured' | 'new_arrivals'

/** Hero'da gösterilen ürünler dolguya girmez — anasayfada aynı kart iki kez çıkmasın. */
export async function getHeroProductIds(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('homepage_settings')
      .select('product_ids')
      .in('section', ['hero_top', 'hero_bottom_left', 'hero_bottom_right'])

    return (data || []).flatMap((row: any) => (row.product_ids as string[]) || []).filter(Boolean)
  } catch {
    return []
  }
}

/**
 * homepage_settings tablosundaki küratörlü listeyi okur ve sırasını koruyarak döner.
 * products_display view'u yalnızca is_active = true satırları içerir, bu yüzden
 * pasife çekilmiş ürünler listede yer alsa bile ekrana basılmaz.
 *
 * Küratörlü aktifler önce gelir; liste 8'e ulaşmıyorsa en yeni aktif ürünlerle
 * tamamlanır. Dolguya ne küratörlü ürünler ne de excludeIds (hero) girer.
 * Küratörlü listeden hiçbir ürün çözülemezse tamamen fallback'e düşülür.
 */
export async function getHomepageSection(
  section: HomepageSection,
  excludeIds: string[] = []
): Promise<any[]> {
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

    let curated: any[] = []

    if (curatedIds.length > 0) {
      const { data } = await supabase
        .from('products_display')
        .select('*')
        .in('id', curatedIds)

      if (data && data.length > 0) {
        const byId = new Map(data.map((p: any) => [p.id, p]))
        curated = curatedIds.map((id) => byId.get(id)).filter(Boolean)
      }
    }

    if (curated.length >= TARGET_SECTION_ITEMS) {
      return curated.slice(0, MAX_SECTION_ITEMS)
    }

    // Dolgu: en yeni aktif ürünler. Küratörlü ve hariç tutulan id'ler alınmaz.
    const taken = new Set([...curated.map((p: any) => p.id), ...excludeIds])
    const needed = TARGET_SECTION_ITEMS - curated.length

    const { data: recent } = await supabase
      .from('products_display')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(TARGET_SECTION_ITEMS + taken.size)

    const filler = (recent || []).filter((p: any) => !taken.has(p.id)).slice(0, needed)

    return [...curated, ...filler].slice(0, MAX_SECTION_ITEMS)
  } catch {
    return []
  }
}
