import { updateTrendyolStock } from './client'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

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

    if (product.trendyol_barcode) {
      await updateTrendyolStock(product.trendyol_barcode, newStock)
    }

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
  const supabase = await createClient()

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

    // Trendyol'da stoku güncelle
    if (product.trendyol_barcode) {
      await updateTrendyolStock(product.trendyol_barcode, newStock)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Stock decrease error:', error)
    return { success: false, error: error.message }
  }
}
