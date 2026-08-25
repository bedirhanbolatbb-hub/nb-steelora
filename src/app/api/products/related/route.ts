import { NextResponse } from 'next/server'
import { filtreIcinTemizle } from '@/lib/guvenlik/girdi'
import { getGroupKey } from '@/lib/catalog/variants'
import { sayiAlani } from '@/lib/guvenlik/girdi'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('id')
  const category = searchParams.get('category')
  // Faz 27: `limit` doğrulanmıyordu — 'limit=100000' ya da NaN geçebiliyordu.
  const limit = sayiAlani(searchParams.get('limit'), 1, 24, 4)

  if (!productId || !category) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('products_display')
    .select('id, slug, display_title, display_price, display_images, trendyol_category, trendyol_stock, trendyol_barcode, trendyol_id, trendyol_description, trendyol_price, trendyol_images, override_title, override_description, override_price, override_images, collection_id, is_active, is_featured, badge, created_at, updated_at, last_synced_at')
    .ilike('trendyol_category', `%${filtreIcinTemizle(category)}%`)
    .neq('id', productId)
    // Faz 11A: gruplama sonrası eleme yapılacağı için havuz genişletildi.
    .limit(Math.min(60, limit * 8))

  const havuz = data || []

  // Mevcut ürün havuzda YOK (.neq ile elendi); grup anahtarı için ayrıca
  // okunur — yoksa kardeş eleme hiç çalışmazdı.
  const { data: buUrun } = await supabase
    .from('products_display')
    .select('display_title, display_price, trendyol_category, gender')
    .eq('id', productId)
    .maybeSingle()

  /**
   * Faz 11A: "Benzer ürünler"de AYNI ürünün kardeş varyantları çıkıyordu —
   * müşteri baktığı kolyenin Gold hâlini "benzer ürün" diye görüyordu.
   * Aynı varyant grubuna ait olanlar elenir; kalanlardan grup başına yalnız
   * BİR temsilci alınır, yoksa 5 harf varyantı listeyi doldurur.
   */
  const buGrup = buUrun ? getGroupKey(buUrun as any) : null
  const gorulen = new Set<string>()
  const secilen: any[] = []
  for (const p of havuz) {
    const k = getGroupKey(p as any)
    if (buGrup && k === buGrup) continue
    if (gorulen.has(k)) continue
    gorulen.add(k)
    secilen.push(p)
  }

  const shuffled = secilen.sort(() => Math.random() - 0.5).slice(0, limit)

  return NextResponse.json(shuffled)
}
