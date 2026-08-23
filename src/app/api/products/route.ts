import { NextResponse } from 'next/server'
import { sayiAlani } from '@/lib/guvenlik/girdi'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  // Faz 27: uç sınırsızdı — tek istekle tüm katalog (520 satır, her sütun)
  // dökülüyordu. Sayfalama eklendi ve iç sütunlar dışarıda bırakıldı.
  const sp = new URL(request.url).searchParams
  const limit = sayiAlani(sp.get('limit'), 1, 100, 50)
  const offset = sayiAlani(sp.get('offset'), 0, 10000, 0)

  const { data, error } = await supabase
    .from('products_display')
    .select(
      'id, slug, display_title, display_price, display_images, trendyol_category, trendyol_stock, gender, variant_label, badge, is_featured, avg_rating, review_count, created_at'
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    // Ham Postgres metni istemciye dönmesin.
    console.error('[products] sorgu hatası:', error.message)
    return NextResponse.json({ error: 'Ürünler getirilemedi' }, { status: 500 })
  }

  return NextResponse.json(data)
}
