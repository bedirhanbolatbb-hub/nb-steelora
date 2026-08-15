import { createClient } from '@/lib/supabase/server'
import { getGroupKey, type GroupableProduct } from '@/lib/catalog/variants'
import { LISTING_COLUMNS } from '@/lib/catalog/listing'

// Anasayfadaki hiçbir bölüm bu sayıdan fazla kart basmaz.
export const MAX_SECTION_ITEMS = 12

// Küratörlü liste kısa kaldığında bölümün tamamlanacağı ürün sayısı.
export const TARGET_SECTION_ITEMS = 8

export type HomepageSection = 'featured' | 'new_arrivals'

/**
 * Bölümler arası tekilleştirme kümesi. Bir ürün üst bölümde basıldıysa
 * kendisi de grubundan bir kardeşi de alt bölümde tekrar basılmaz.
 */
export class ShownProducts {
  private ids = new Set<string>()
  private groups = new Set<string>()

  add(products: GroupableProduct[]) {
    for (const p of products) {
      this.ids.add(p.id)
      this.groups.add(getGroupKey(p))
    }
  }

  has(product: GroupableProduct): boolean {
    return this.ids.has(product.id) || this.groups.has(getGroupKey(product))
  }
}

/** Hero'da gösterilen ürün — öncelik sırasının en üstü.
 * Faz 8B: hero tek görsele indi; hero_bottom_* slotları emekli (satırlar
 * veride duruyor, okunmuyor). */
export async function getHeroProducts(): Promise<any[]> {
  try {
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('homepage_settings')
      .select('product_ids')
      .in('section', ['hero_top'])

    const ids = (settings || [])
      .flatMap((row: any) => (row.product_ids as string[]) || [])
      .filter(Boolean)

    if (ids.length === 0) return []

    const { data } = await supabase
      .from('products_display')
      .select(LISTING_COLUMNS)
      .in('id', ids)

    return data || []
  } catch {
    return []
  }
}

/**
 * homepage_settings tablosundaki küratörlü listeyi okur ve sırasını koruyarak döner.
 * products_display view'u yalnızca is_active = true satırları içerir.
 *
 * Öncelik kuralı: hero > featured > new_arrivals. Üst bölümde basılmış bir ürün
 * (veya grubundan bir üye) küratörlü seçimde bile olsa alt bölümde basılmaz;
 * yerine dolgu gelir. Küratörlü listeden hiç ürün kalmazsa tamamen dolguya düşülür.
 */
export async function getHomepageSection(
  section: HomepageSection,
  shown?: ShownProducts
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

    const selected: any[] = []
    const local = new ShownProducts()

    if (curatedIds.length > 0) {
      const { data } = await supabase
        .from('products_display')
        .select(LISTING_COLUMNS)
        .in('id', curatedIds)

      if (data && data.length > 0) {
        const byId = new Map(data.map((p: any) => [p.id, p]))
        for (const id of curatedIds) {
          const product = byId.get(id)
          if (!product) continue
          if (shown?.has(product) || local.has(product)) continue
          selected.push(product)
          local.add([product])
        }
      }
    }

    if (selected.length < TARGET_SECTION_ITEMS) {
      // Dolgu: en yeni aktif ürünler. Üst bölümlerde basılanlar ve bu bölümde
      // zaten seçilenler (grup kardeşleri dahil) alınmaz.
      const { data: recent } = await supabase
        .from('products_display')
        .select(LISTING_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(120)

      for (const product of recent || []) {
        if (selected.length >= TARGET_SECTION_ITEMS) break
        if (shown?.has(product) || local.has(product)) continue
        selected.push(product)
        local.add([product])
      }
    }

    return selected.slice(0, MAX_SECTION_ITEMS)
  } catch {
    return []
  }
}
