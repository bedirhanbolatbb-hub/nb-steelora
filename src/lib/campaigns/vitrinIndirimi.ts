import { createServiceClient } from '@/lib/supabase/service'

export type VitrinIndirimi = { ad: string; oran: number }

/**
 * Vitrinde gösterilecek otomatik sepet indirimi (Faz 15).
 *
 * BB tüm ürünlerde %30 kampanya tanımladı ama vitrinde bunun izi yoktu:
 * müşteri indirimi ancak ödeme adımında görüyordu. Burada, sepet alt sınırı
 * OLMAYAN (yani her sepette geçerli) yüzde tipi otomatik kampanyanın oranı
 * okunur; kart ve ürün sayfası üstü çizili fiyatı buna göre basar.
 *
 * Alt sınırı olan kampanyalar dışarıda bırakılır — "her üründe %30" demek
 * yanıltıcı olurdu. Tutarın kendisi yine tek motordan (pricing.ts) hesaplanır;
 * burası yalnız görsel işaret üretir.
 */
export async function vitrinIndirimiGetir(): Promise<VitrinIndirimi | null> {
  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('campaigns')
      .select('name, discount_type, discount_value, min_cart_amount, max_uses, used_count')
      .eq('is_active', true)
      .eq('type', 'cart_discount')
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)

    let enIyi: VitrinIndirimi | null = null
    for (const k of data ?? []) {
      // Şemada yüzde tipi 'percent' olarak yazılıyor.
      if (k.discount_type !== 'percent') continue
      if (Number(k.min_cart_amount ?? 0) > 0) continue
      if (k.max_uses != null && (k.used_count ?? 0) >= k.max_uses) continue
      const oran = Number(k.discount_value)
      if (!Number.isFinite(oran) || oran <= 0 || oran >= 100) continue
      if (!enIyi || oran > enIyi.oran) enIyi = { ad: k.name, oran }
    }
    return enIyi
  } catch {
    return null
  }
}
