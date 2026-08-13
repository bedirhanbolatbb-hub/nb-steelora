import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groupProducts } from '@/lib/catalog/variants'

const RESULT_LIMIT = 8

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  // Arama hem görünen (kısa) ad hem de uzun Trendyol başlığı üzerinde çalışır:
  // kısa adlar devreye girince "zirkon taşlı", "figürlü" gibi kelimelerle
  // yapılan aramalar sonuçsuz kalmasın. Sonuç satırında görünen ad basılır.
  // Gruplama sonucu kart sayısını düşürdüğü için ham eşleşmeden fazlası çekilir.
  const { data } = await supabase
    .from('products_display')
    .select(
      'id, slug, display_title, display_price, display_images, trendyol_category, trendyol_stock, gender, created_at, variant_label'
    )
    .or(
      `display_title.ilike.%${q}%,trendyol_title.ilike.%${q}%,trendyol_category.ilike.%${q}%`
    )
    .limit(RESULT_LIMIT * 8)

  const results = groupProducts(data || [])
    .slice(0, RESULT_LIMIT)
    .map((group) => ({ ...group.cover, option_count: group.optionCount }))

  // Aynı sorgu kısa süre içinde tekrar yazıldığında (yaygın: silip yeniden
  // yazma) yanıt kenardan döner. İçerik kişiye özel değil; stok/fiyat
  // değişimi en geç bir dakika sonra yansır.
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  })
}
