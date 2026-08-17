import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Gecelik özet + saklama temizliği (Faz 12).
 *
 * 1) Dün için analytics_daily ve analytics_product_daily satırlarını üretir
 *    (panel önce özetten okur, bugünü canlı olaylardan tamamlar).
 * 2) 13 aydan eski ham olayları siler — Katman A ve B için aynı süre.
 *
 * CRON_SECRET ile korunur; Vercel cron başlığı da kabul edilir.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const gizli = process.env.CRON_SECRET
  const yetkili =
    request.headers.get('authorization') === `Bearer ${gizli}` ||
    url.searchParams.get('secret') === gizli ||
    request.headers.get('x-vercel-cron') === '1'
  if (!yetkili) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const gun = url.searchParams.get('gun') || new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const bas = `${gun}T00:00:00+03:00`
  const bit = `${gun}T23:59:59.999+03:00`

  const { data: olaylar, error } = await supabase
    .from('analytics_events')
    .select('event, session_id, visitor_id, product_id, value')
    .gte('occurred_at', bas)
    .lte('occurred_at', bit)
    .limit(50000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const oturumlar = new Set<string>()
  const ziyaretciler = new Set<string>()
  let pv = 0, urun = 0, sepet = 0, odeme = 0, satis = 0, ciro = 0, uyelik = 0, favori = 0
  const urunOzet = new Map<string, { views: number; atc: number; purchases: number; revenue: number; fav: number }>()
  const urunAl = (id: string) => {
    if (!urunOzet.has(id)) urunOzet.set(id, { views: 0, atc: 0, purchases: 0, revenue: 0, fav: 0 })
    return urunOzet.get(id)!
  }

  for (const o of olaylar || []) {
    oturumlar.add(o.session_id)
    ziyaretciler.add(o.visitor_id || o.session_id)
    if (o.event === 'page_view') pv++
    if (o.event === 'product_view') { urun++; if (o.product_id) urunAl(o.product_id).views++ }
    if (o.event === 'add_to_cart') { sepet++; if (o.product_id) urunAl(o.product_id).atc++ }
    if (o.event === 'favorite_add') { favori++; if (o.product_id) urunAl(o.product_id).fav++ }
    if (o.event === 'begin_checkout') odeme++
    if (o.event === 'signup') uyelik++
    if (o.event === 'purchase') { satis++; ciro += Number(o.value) || 0 }
  }

  const { error: gunlukErr } = await supabase.from('analytics_daily').upsert(
    {
      day: gun,
      sessions: oturumlar.size,
      visitors: ziyaretciler.size,
      page_views: pv,
      product_views: urun,
      add_to_cart: sepet,
      begin_checkout: odeme,
      purchases: satis,
      revenue: Math.round(ciro * 100) / 100,
      signups: uyelik,
      favorites: favori,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'day' }
  )
  if (gunlukErr) console.error('[rollup] günlük özet hatası:', gunlukErr.message)

  if (urunOzet.size > 0) {
    const satirlar = [...urunOzet.entries()].map(([product_id, v]) => ({
      day: gun,
      product_id,
      views: v.views,
      add_to_cart: v.atc,
      purchases: v.purchases,
      revenue: v.revenue,
      favorites: v.fav,
      computed_at: new Date().toISOString(),
    }))
    const { error: urunErr } = await supabase
      .from('analytics_product_daily')
      .upsert(satirlar, { onConflict: 'day,product_id' })
    if (urunErr) console.error('[rollup] ürün özeti hatası:', urunErr.message)
  }

  // Saklama: 13 aydan eski ham olaylar silinir.
  const sinir = new Date(Date.now() - 395 * 86400000).toISOString()
  const { error: temizlikErr } = await supabase.from('analytics_events').delete().lt('occurred_at', sinir)
  if (temizlikErr) console.error('[rollup] temizlik hatası:', temizlikErr.message)

  return NextResponse.json({
    ok: true,
    gun,
    olay: olaylar?.length ?? 0,
    oturum: oturumlar.size,
    urunSatiri: urunOzet.size,
  })
}
