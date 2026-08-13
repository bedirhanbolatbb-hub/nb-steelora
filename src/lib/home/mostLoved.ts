import { createClient } from '@/lib/supabase/server'
import { LISTING_COLUMNS } from '@/lib/catalog/listing'

/**
 * "Çok Beğenilenler" bölümü yalnız yeterli sosyal kanıt biriktiğinde açılır:
 * en az bu kadar üründe onaylı yorum olmalı. Eşik altındaysa bölüm hiç render
 * edilmez ve hero CTA'sı "Öne Çıkanlar" olarak kalır — uydurma sıralama yok.
 */
export const MOST_LOVED_MIN_PRODUCTS = 8
export const MOST_LOVED_SIZE = 8

export async function getMostLovedProducts(): Promise<any[]> {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('products_display')
      .select(LISTING_COLUMNS)
      .gt('review_count', 0)
      .order('avg_rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(MOST_LOVED_SIZE * 3)

    const withReviews = data ?? []
    if (withReviews.length < MOST_LOVED_MIN_PRODUCTS) return []

    return withReviews.slice(0, MOST_LOVED_SIZE)
  } catch {
    return []
  }
}
