import { NextResponse } from 'next/server'
import { adminIstegiMi, cronIstegiMi } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { makineleriBul } from '@/lib/analytics/makine'

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
  // Faz 27: iki kusur kapatıldı.
  //  1. `x-vercel-cron: 1` tek başına yetki sayılıyordu — bu başlık dışarıdan
  //     gelen istekte de taşınabilir, Vercel onu güvenilir kimlik olarak
  //     GARANTİ ETMEZ. Kimliksiz biri bu uçla analytics_events üzerinde toplu
  //     silme çalıştırabilirdi (aşağıda 395 günden eski her satır siliniyor).
  //  2. CRON_SECRET tanımsızsa şablon dize "Bearer undefined" üretiyordu ve
  //     saldırgan tam o başlıkla yetkili sayılıyordu — açık başarısız.
  // İkisi de tek kaynaktaki `cronIstegiMi` ile çözüldü: sabit zamanlı
  // karşılaştırma, sır yoksa kapalı başarısız.
  // Panel oturumu da kabul edilir (Faz 32): geçmiş günlerin özeti elle yeniden
  // üretilebilsin diye. Fark önemli — SAKLAMA TEMİZLİĞİ yalnız cron koşusunda
  // çalışır; elle tetiklenen bir yeniden hesap hiçbir satırı silmez.
  const cron = cronIstegiMi(request)
  if (!cron && !(await adminIstegiMi(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const gun = url.searchParams.get('gun') || new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const bas = `${gun}T00:00:00+03:00`
  const bit = `${gun}T23:59:59.999+03:00`

  /**
   * SAYFALAMA ZORUNLU (Faz 32 — ölçülen kusur).
   *
   * Burada `.limit(50000)` yazıyordu ama PostgREST tek istekte en çok 1.000
   * satır döndürür; istenen sayı sunucu tavanını AŞAMAZ. Yani gecelik özet bir
   * günün yalnız İLK 1.000 hareketini okuyordu ve fazlası sessizce düşüyordu.
   * Kanıt: 27 Ağustos'ta özet tabloya 548 sayfa görüntüleme yazılmıştı, o günün
   * gerçek sayısı 7.850'di. Her sabah giden sağlık raporu bu tablodan okuduğu
   * için yoğun günlerde HEP eksik rakam bildiriyordu.
   */
  type OzetOlay = {
    event: string
    session_id: string
    visitor_id: string | null
    product_id: string | null
    value: number | null
    path: string | null
    occurred_at: string
    meta: Record<string, unknown> | null
  }
  const olaylar: OzetOlay[] = []
  const adim = 1000
  for (let i = 0; i < 200; i++) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event, session_id, visitor_id, product_id, value, path, occurred_at, meta')
      .gte('occurred_at', bas)
      .lte('occurred_at', bit)
      .order('occurred_at', { ascending: true })
      .range(i * adim, i * adim + adim - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    olaylar.push(...(data as OzetOlay[]))
    if (data.length < adim) break
  }

  /**
   * Panelle AYNI ayıklama (Faz 32). Önceden özet ham satırları sayıyordu;
   * panel ise makine oturumlarını eliyordu. İki yer aynı gün için farklı sayı
   * gösteriyordu — mail 174, panel 173 gibi. Artık tek hesap.
   */
  const ayiklama = makineleriBul(olaylar)
  const temiz = olaylar.filter((o) => !ayiklama.makineOturumlar.has(o.session_id))

  const oturumlar = new Set<string>()
  const ziyaretciler = new Set<string>()
  let pv = 0, urun = 0, sepet = 0, odeme = 0, satis = 0, ciro = 0, uyelik = 0, favori = 0
  const urunOzet = new Map<string, { views: number; atc: number; purchases: number; revenue: number; fav: number }>()
  const urunAl = (id: string) => {
    if (!urunOzet.has(id)) urunOzet.set(id, { views: 0, atc: 0, purchases: 0, revenue: 0, fav: 0 })
    return urunOzet.get(id)!
  }

  for (const o of temiz) {
    oturumlar.add(o.session_id)
    // Tarayıcı işareti satırı (Faz 32): sayfa görüntüleme DEĞİL, yalnız
    // oturumun gerçek bir tarayıcıdan geldiğinin kanıtı. `visitors` sütunu
    // artık bunu taşır; sabah giden rapor da panelin gösterdiği ihtiyatlı
    // sayıyı yazar. `sessions` ham (robotu ayıklanmış) oturum sayısıdır.
    if (o.event === 'page_view' && Number(o.meta?.js) === 1) {
      ziyaretciler.add(o.session_id)
      continue
    }
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
      // Tarayıcı doğrulaması 13 Eylül'de başladı. O günden ÖNCEKİ günler
      // yeniden hesaplandığında hiç işaret satırı bulunmaz; `visitors` sıfır
      // yazılırsa geçmiş günler boş görünürdü. İşaret yoksa eski anlamına
      // (oturum sayısı) düşülür — uydurma değil, o günün elde olan en iyi sayısı.
      visitors: ziyaretciler.size > 0 ? ziyaretciler.size : oturumlar.size,
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

  // Saklama: 13 aydan eski ham olaylar silinir — YALNIZ gecelik cron koşusunda.
  if (cron) {
    const sinir = new Date(Date.now() - 395 * 86400000).toISOString()
    const { error: temizlikErr } = await supabase
      .from('analytics_events')
      .delete()
      .lt('occurred_at', sinir)
    if (temizlikErr) console.error('[rollup] temizlik hatası:', temizlikErr.message)
  }

  return NextResponse.json({
    ok: true,
    gun,
    hamOlay: olaylar.length,
    olay: temiz.length,
    ayiklananOturum: ayiklama.oturum,
    ayiklananOlay: ayiklama.olay,
    oturum: oturumlar.size,
    urunSatiri: urunOzet.size,
  })
}
