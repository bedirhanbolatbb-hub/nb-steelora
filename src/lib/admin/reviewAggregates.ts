import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Bir ürünün yorum özetini ONAYLI yorumlardan yeniden hesaplar.
 * products.avg_rating / review_count kart ve liste sorgularının okuduğu alanlar;
 * moderasyon her değiştiğinde burada tazelenir. Sync'in sahip olduğu
 * trendyol kolonlarına ya da override katmanına dokunmaz.
 */
export async function recalcProductReviewStats(
  supabase: SupabaseClient,
  productId: string
): Promise<{ avg: number; count: number }> {
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('is_approved', true)

  const ratings = (data ?? []).map((r: any) => Number(r.rating)).filter(Number.isFinite)
  const count = ratings.length
  const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0

  await supabase
    .from('products')
    .update({
      avg_rating: count > 0 ? Number(avg.toFixed(2)) : 0,
      review_count: count,
    })
    .eq('id', productId)

  return { avg, count }
}
