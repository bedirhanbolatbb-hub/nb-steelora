import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Kampanya hedeflerini ve kademelerini yazar (Faz 17).
 *
 * Hedefler (kategori/koleksiyon/ürün) ve kademeler ayrı tablolarda tutulur;
 * kampanya kaydedilirken bu iki liste tazelenir. Tablolar henüz kurulmadıysa
 * (migration inmediyse) yazım sessizce atlanır — kampanyanın kendisi kaydedilir
 * ve panel uyarısı görünür.
 */
export async function hedefVeKademeYaz(
  supabase: SupabaseClient,
  kampanyaId: string,
  kapsam: string,
  hedefler: string[],
  kademeler: { min_cart_amount: number; discount_value: number }[]
): Promise<{ v2Hazir: boolean }> {
  let v2Hazir = true

  const temizle = await supabase.from('campaign_targets').delete().eq('campaign_id', kampanyaId)
  if (temizle.error) v2Hazir = false

  if (v2Hazir && kapsam !== 'cart' && hedefler.length > 0) {
    // Kategori hedefi metin, koleksiyon ve ürün hedefi kimliktir.
    const satirlar = hedefler.map((h) => ({
      campaign_id: kampanyaId,
      target_type: kapsam === 'category' ? 'category' : kapsam === 'collection' ? 'collection' : 'product',
      category_value: kapsam === 'category' ? h : null,
      collection_id: kapsam === 'collection' ? h : null,
      product_id: kapsam === 'product' ? h : null,
    }))
    const { error } = await supabase.from('campaign_targets').insert(satirlar)
    if (error) v2Hazir = false
  }

  const kademeTemizle = await supabase.from('campaign_tiers').delete().eq('campaign_id', kampanyaId)
  if (kademeTemizle.error) v2Hazir = false

  if (v2Hazir && kademeler.length > 0) {
    const { error } = await supabase.from('campaign_tiers').insert(
      kademeler.map((k) => ({
        campaign_id: kampanyaId,
        min_cart_amount: k.min_cart_amount,
        discount_type: 'percent',
        discount_value: k.discount_value,
      }))
    )
    if (error) v2Hazir = false
  }

  return { v2Hazir }
}
