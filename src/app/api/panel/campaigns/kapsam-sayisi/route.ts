import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * "Şu an kaç ürün kapsamda?" (Faz 22).
 *
 * Stok ve fiyat kapsamları ANLIK hesaplanır: kampanyaya donmuş bir ürün
 * listesi yazılmaz, üyelik her sepet hesabında o anki değerden çıkar. Panel
 * de aynı ölçütü canlı katalogda sayarak BB'ye ne kadar ürünü etkilediğini
 * gösterir — kampanya kaydedilmeden önce.
 *
 * Sayım YALNIZ AKTİF ürünlerde yapılır: pasif ürün zaten satılmıyor.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const kapsam = String(body?.scope ?? '')
  const sayi = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const supabase = createServiceClient()
  let sorgu = supabase
    .from('products_display')
    .select('id', { count: 'exact', head: true })

  if (kapsam === 'stock') {
    const esik = sayi(body?.stokAzami)
    if (!esik) return NextResponse.json({ ok: true, adet: 0, not: 'eşik girilmedi' })
    sorgu = sorgu.lte('trendyol_stock', esik).gt('trendyol_stock', 0)
  } else if (kapsam === 'price_range') {
    const alt = sayi(body?.fiyatMin)
    const ust = sayi(body?.fiyatMax)
    if (!alt && !ust) return NextResponse.json({ ok: true, adet: 0, not: 'sınır girilmedi' })
    if (alt) sorgu = sorgu.gte('display_price', alt)
    if (ust) sorgu = sorgu.lte('display_price', ust)
  } else if (kapsam === 'category') {
    const hedefler: string[] = Array.isArray(body?.targets) ? body.targets : []
    if (hedefler.length === 0) return NextResponse.json({ ok: true, adet: 0 })
    sorgu = sorgu.or(hedefler.map((h) => `trendyol_category.ilike.%${h}%`).join(','))
  } else {
    return NextResponse.json({ ok: true, adet: null, not: 'bu kapsamda anlık sayım yok' })
  }

  const { count, error } = await sorgu
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, adet: count ?? 0 })
}
