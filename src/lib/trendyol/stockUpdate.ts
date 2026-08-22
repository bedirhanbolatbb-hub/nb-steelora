import { updateTrendyolStock } from './client'
import { createServiceClient } from '@/lib/supabase/service'
import { stokYazimModu, yazimAcik } from './stokYazimBayragi'

export async function increaseStock(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  try {
    const { data: product } = await supabase
      .from('products')
      .select('trendyol_stock, trendyol_barcode, trendyol_id')
      .eq('id', productId)
      .single()

    if (!product) throw new Error('Ürün bulunamadı')

    const newStock = (product.trendyol_stock ?? 0) + quantity

    await supabase.from('products').update({ trendyol_stock: newStock }).eq('id', productId)

    // Trendyol yazımı bayrağa bağlı (Faz 16B). Kapalıyken mutlak değer
    // yazılmaz — bayat DB değerinden hesaplanan mutlak stok, Trendyol'daki
    // gerçek stoğu ezip olmayan ürünü satışa açabiliyordu.
    await trendyolaYaz(product.trendyol_barcode, newStock, quantity, 'iade')

    return { success: true }
  } catch (error: any) {
    console.error('Stock increase error:', error)
    return { success: false, error: error.message }
  }
}

export async function decreaseStock(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  // Service role: payment callback has no user cookies; anon client cannot update products under typical RLS.
  const supabase = createServiceClient()

  try {
    const { data: product } = await supabase
      .from('products')
      .select('trendyol_stock, trendyol_barcode, trendyol_id')
      .eq('id', productId)
      .single()

    if (!product) throw new Error('Ürün bulunamadı')

    const newStock = Math.max(0, product.trendyol_stock - quantity)

    // Supabase'de stoku güncelle
    await supabase
      .from('products')
      .update({ trendyol_stock: newStock })
      .eq('id', productId)

    // Trendyol'da stoku güncelle — bayrağa bağlı (Faz 16B).
    await trendyolaYaz(product.trendyol_barcode, newStock, quantity, 'satis')

    return { success: true }
  } catch (error: any) {
    console.error('Stock decrease error:', error)
    return { success: false, error: error.message }
  }
}


/**
 * Bayrak kademesine göre Trendyol yazımı.
 *
 * off/shadow: yazılmaz, tek satır log düşülür. Yazım açıldığında bile bu yol
 * MUTLAK değer gönderir; doğru yol (canlı stok okuyup delta uygulamak) kuyruk
 * katmanında kurulur — bu fonksiyon yalnız eski davranışın kapısıdır.
 */
async function trendyolaYaz(
  barcode: string | null | undefined,
  yeniStok: number,
  adet: number,
  yon: 'satis' | 'iade'
): Promise<void> {
  if (!barcode) return
  const mod = stokYazimModu()
  if (!yazimAcik(barcode)) {
    console.log(
      `[stok-yazim] ${mod} · YAZILMADI · barkod=${barcode} · yön=${yon} · adet=${adet} · ` +
        `DB'deki yeni değer=${yeniStok}`
    )
    return
  }
  await updateTrendyolStock(barcode, yeniStok)
  console.log(`[stok-yazim] on · YAZILDI · barkod=${barcode} · değer=${yeniStok} · yön=${yon}`)
}
