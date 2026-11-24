import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'
import { renkGrubu, type RenkGrubu } from './renk'

/**
 * Renk kolonu var mı? (docs/renk/01-renk-alani.sql)
 *
 * Senkron bu kolonu DDL inmeden yazmaz: bilinmeyen bir kolon toplu yazmayı
 * düşürür ve sayfadaki ürünler koşu sonunda pasife çekilir (model koduyla aynı
 * koruma — lib/catalog/urunKodlari).
 */
export async function renkKolonuVar(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').select('trendyol_color').limit(1)
    return !error
  } catch {
    return false
  }
}

/**
 * Ürün kimliği → renk grubu (yalnız satıştaki ürünler).
 *
 * Liste sayfaları ürünleri `products_display` görünümünden okur; görünümde
 * renk yok. Görünümü değiştirmek yerine küçük bir yan sorgu: iki kısa kolon,
 * birkaç yüz satır. Kolon yoksa, henüz dolmadıysa ya da sorgu düşerse boş
 * harita döner — süzgeç o zaman hiç basılmaz, liste aynen çalışır.
 */
export async function renkHaritasiGetir(): Promise<Map<string, RenkGrubu>> {
  const harita = new Map<string, RenkGrubu>()
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, trendyol_color, trendyol_title')
      .eq('is_active', true)
      .not('trendyol_color', 'is', null)
      .limit(1000)
    if (error) return harita
    for (const satir of (data ?? []) as { id: string; trendyol_color: string | null; trendyol_title: string | null }[]) {
      const grup = renkGrubu(satir.trendyol_color, satir.trendyol_title)
      if (grup) harita.set(satir.id, grup)
    }
  } catch {
    // Bilerek boş: renk verisi listeyi asla düşürmez.
  }
  return harita
}
