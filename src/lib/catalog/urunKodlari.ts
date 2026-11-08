/**
 * Ürün kodları (panel): Trendyol barkodu ve model kodu.
 *
 * Model kodu Trendyol'un "Model Kodu"dur (API'de content.productMainId).
 * Trendyol kataloğundaki 635 ürünün 229'unda barkoddan farklı (ör. barkod
 * NBB115 → model NBB101). Trendyol satıcı panelinde ürün araması ikisiyle de
 * çalışıyor, raporlar (Favori & Görüntülenme) ise model koduyla listeliyor; bu
 * yüzden panelde ikisi birlikte gösterilir.
 *
 * Kolon docs/urun-kodlari/01-model-kodu.sql ile eklenir; DDL'i BB çalıştırır.
 * Kod kolondan önce yayına çıkabilsin diye her okuma ve yazma önce kolonun
 * varlığına bakar. Kolon yoksa ya da sorgu düşerse "yok" sayılır: senkron
 * alanı yazmaz, panel yalnız barkodu gösterir. Kapalı başarısızlık bilinçli —
 * senkronun toplu yazması bilinmeyen bir kolon yüzünden düşseydi o sayfadaki
 * ürünler koşu sonunda "görülmedi" diye pasife çekilirdi.
 *
 * Yalnız panelde ve senkronda kullanılır; vitrin, sepet, ödeme ve Google ürün
 * akışı bu kolona bakmaz.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export async function modelKoduKolonuVar(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').select('trendyol_model_code').limit(1)
    return !error
  } catch {
    return false
  }
}

/** Trendyol'dan gelen model kodunu yazılacak hâle getirir; boşsa null. */
export function modelKoduTemizle(deger: unknown): string | null {
  if (deger === null || deger === undefined) return null
  const metin = String(deger).trim()
  return metin.length > 0 ? metin : null
}
