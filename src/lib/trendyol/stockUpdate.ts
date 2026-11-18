import { createServiceClient } from '@/lib/supabase/service'
import { vitriniYenile } from '@/lib/cache/vitrin'

/*
 * Bu dosya YALNIZ bizim veritabanımızdaki stoğu değiştirir.
 *
 * Trendyol'a stok yazımı tek yoldan yapılır: stok kuyruğu (kuyrugaEkle +
 * kuyrugaIsle) canlı Trendyol stoğunu okur ve deltayı onun üstüne uygular.
 * Buradaki her çağıran (ödeme, iptal, iade, kalem iptali) kuyruğa da yazıyor.
 *
 * 18 Kas 2026'ya kadar burada ayrıca MUTLAK değer de yazılıyordu: aynı barkoda
 * birkaç saniye arayla iki istek gidiyordu. Trendyol ilkini işledikten sonra
 * kuyruk canlı stoğu okursa ya da kuyruk isteği reddedilip yeniden denenirse
 * aynı satış iki kez düşülebiliyordu (ya da iade iki kez eklenebiliyordu).
 */

export async function increaseStock(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  try {
    const { data: product } = await supabase
      .from('products')
      .select('trendyol_stock')
      .eq('id', productId)
      .single()

    if (!product) throw new Error('Ürün bulunamadı')

    const newStock = (product.trendyol_stock ?? 0) + quantity

    await supabase.from('products').update({ trendyol_stock: newStock }).eq('id', productId)
    // Ürün sayfası 24 saat önbellekte duruyor: stok değişince hemen tazelensin
    // ("Son 1 adet" ve sepete ekle doğru kalsın).
    vitriniYenile()

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
      .select('trendyol_stock')
      .eq('id', productId)
      .single()

    if (!product) throw new Error('Ürün bulunamadı')

    const newStock = Math.max(0, product.trendyol_stock - quantity)

    // Supabase'de stoku güncelle
    await supabase
      .from('products')
      .update({ trendyol_stock: newStock })
      .eq('id', productId)
    // Ürün sayfası 24 saat önbellekte duruyor: stok değişince hemen tazelensin.
    vitriniYenile()

    return { success: true }
  } catch (error: any) {
    console.error('Stock decrease error:', error)
    return { success: false, error: error.message }
  }
}
