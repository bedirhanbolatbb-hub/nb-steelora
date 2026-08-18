import { createServiceClient } from '@/lib/supabase/service'

/**
 * Panel raporlama sorguları (Faz 12).
 *
 * Tüm temel metrikler KATMAN A'dan (anonim, rıza gerekmeyen) hesaplanır ki
 * rıza oranından bağımsız olarak tam olsunlar. Yalnız "tekrar gelen ziyaretçi"
 * Katman B'ye dayanır ve panelde bu not düşülür.
 */

export type Donem = { baslangic: Date; bitis: Date; etiket: string }

const ISTANBUL = 'Europe/Istanbul'

/** Verilen günün İstanbul saatiyle 00:00'ı (UTC Date olarak). */
function gunBasi(d: Date): Date {
  const s = d.toLocaleString('en-US', { timeZone: ISTANBUL })
  const yerel = new Date(s)
  yerel.setHours(0, 0, 0, 0)
  // Yerel/UTC farkını geri ekle
  const fark = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime() - new Date(s).getTime()
  return new Date(yerel.getTime() + fark)
}

export function donemCoz(anahtar: string, ozelBas?: string, ozelBit?: string): Donem {
  const simdi = new Date()
  const bugun = gunBasi(simdi)
  const gun = 86400000

  switch (anahtar) {
    case 'dun':
      return { baslangic: new Date(bugun.getTime() - gun), bitis: bugun, etiket: 'Dün' }
    case 'son7':
      return { baslangic: new Date(bugun.getTime() - 6 * gun), bitis: simdi, etiket: 'Son 7 gün' }
    case 'son30':
      return { baslangic: new Date(bugun.getTime() - 29 * gun), bitis: simdi, etiket: 'Son 30 gün' }
    case 'buay': {
      const b = new Date(bugun)
      b.setDate(1)
      return { baslangic: b, bitis: simdi, etiket: 'Bu ay' }
    }
    case 'gecenay': {
      const b = new Date(bugun)
      b.setDate(1)
      const son = new Date(b)
      b.setMonth(b.getMonth() - 1)
      return { baslangic: b, bitis: son, etiket: 'Geçen ay' }
    }
    case 'buyil': {
      const b = new Date(bugun)
      b.setMonth(0, 1)
      return { baslangic: b, bitis: simdi, etiket: 'Bu yıl' }
    }
    case 'ozel': {
      const b = ozelBas ? new Date(ozelBas) : new Date(bugun.getTime() - 6 * gun)
      const s = ozelBit ? new Date(new Date(ozelBit).getTime() + gun) : simdi
      return { baslangic: b, bitis: s, etiket: 'Özel aralık' }
    }
    default:
      return { baslangic: bugun, bitis: simdi, etiket: 'Bugün' }
  }
}

/** Bir önceki eşit uzunlukta dönem (değişim yüzdesi için). */
export function oncekiDonem(d: Donem): Donem {
  const uzunluk = d.bitis.getTime() - d.baslangic.getTime()
  return {
    baslangic: new Date(d.baslangic.getTime() - uzunluk),
    bitis: new Date(d.baslangic.getTime()),
    etiket: 'önceki dönem',
  }
}

type HamOlay = {
  event: string
  session_id: string
  visitor_id: string | null
  occurred_at: string
  path: string | null
  referrer_host: string | null
  device: string | null
  product_id: string | null
  search_query: string | null
  value: number | null
  order_id: string | null
  meta: any
}

/** Dönemdeki ham olaylar (sayfalama ile — 50 bin satıra kadar). */
async function olaylariCek(d: Donem): Promise<HamOlay[]> {
  const supabase = createServiceClient()
  const hepsi: HamOlay[] = []
  const adim = 1000
  for (let bas = 0; bas < 50000; bas += adim) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event, session_id, visitor_id, occurred_at, path, referrer_host, device, product_id, search_query, value, order_id, meta')
      .gte('occurred_at', d.baslangic.toISOString())
      .lt('occurred_at', d.bitis.toISOString())
      .order('occurred_at', { ascending: true })
      .range(bas, bas + adim - 1)
    if (error || !data || data.length === 0) break
    hepsi.push(...(data as HamOlay[]))
    if (data.length < adim) break
  }
  return hepsi
}

export type Metrikler = {
  ziyaretci: number
  oturum: number
  sayfaGoruntuleme: number
  ortOturumSaniye: number
  urunGoruntuleme: number
  sepeteEkleme: number
  favori: number
  uyelik: number
  odemeBaslama: number
  siparis: number
  ciro: number
  donusumOrani: number
  sepeteEklemeOrani: number
  sepettenOdemeOrani: number
}

function metrikHesapla(olaylar: HamOlay[]): Metrikler {
  const oturumlar = new Set<string>()
  const ziyaretciler = new Set<string>()
  const oturumZamanlari = new Map<string, { ilk: number; son: number }>()
  let sayfa = 0, urun = 0, sepet = 0, favori = 0, uyelik = 0, odeme = 0, siparis = 0, ciro = 0

  for (const o of olaylar) {
    oturumlar.add(o.session_id)
    // Ziyaretçi: Katman B kimliği varsa o, yoksa oturum (Katman A'da oturum = ziyaretçi)
    ziyaretciler.add(o.visitor_id || o.session_id)

    const t = new Date(o.occurred_at).getTime()
    const mevcut = oturumZamanlari.get(o.session_id)
    if (!mevcut) oturumZamanlari.set(o.session_id, { ilk: t, son: t })
    else oturumZamanlari.set(o.session_id, { ilk: Math.min(mevcut.ilk, t), son: Math.max(mevcut.son, t) })

    switch (o.event) {
      case 'page_view': sayfa++; break
      case 'product_view': urun++; break
      case 'add_to_cart': sepet++; break
      case 'favorite_add': favori++; break
      case 'signup': uyelik++; break
      case 'begin_checkout': odeme++; break
      case 'purchase': siparis++; ciro += Number(o.value) || 0; break
    }
  }

  const sureler = [...oturumZamanlari.values()].map((s) => (s.son - s.ilk) / 1000).filter((s) => s > 0)
  const ortSure = sureler.length ? sureler.reduce((a, b) => a + b, 0) / sureler.length : 0

  const oturumSayisi = oturumlar.size
  return {
    ziyaretci: ziyaretciler.size,
    oturum: oturumSayisi,
    sayfaGoruntuleme: sayfa,
    ortOturumSaniye: Math.round(ortSure),
    urunGoruntuleme: urun,
    sepeteEkleme: sepet,
    favori,
    uyelik,
    odemeBaslama: odeme,
    siparis,
    ciro: Math.round(ciro * 100) / 100,
    donusumOrani: oturumSayisi ? Math.round((siparis / oturumSayisi) * 10000) / 100 : 0,
    sepeteEklemeOrani: urun ? Math.round((sepet / urun) * 10000) / 100 : 0,
    sepettenOdemeOrani: sepet ? Math.round((odeme / sepet) * 10000) / 100 : 0,
  }
}

export type UrunSatiri = {
  productId: string
  goruntuleme: number
  sepeteEkleme: number
  satis: number
  favori: number
  oran: number
}

export type Rapor = {
  donem: { etiket: string; baslangic: string; bitis: string }
  metrikler: Metrikler
  onceki: Metrikler
  /** Önceki dönemde hiç ölçüm yoksa karşılaştırma "0'a göre artış" değil, "veri yok"tur. */
  oncekiVeriVar: boolean
  huni: { ad: string; adet: number; oran: number }[]
  urunler: UrunSatiri[]
  firsatlar: UrunSatiri[]
  favoriler: UrunSatiri[]
  cihazlar: { ad: string; adet: number }[]
  kaynaklar: { ad: string; adet: number }[]
  koleksiyonlar: { ad: string; adet: number }[]
  aramalar: { sorgu: string; adet: number; sonucsuz: boolean }[]
  seri: { gun: string; ziyaretci: number; ciro: number }[]
  rizaOrani: number
  katmanBOlay: number
}

export async function raporUret(d: Donem): Promise<Rapor> {
  const [olaylar, oncekiOlaylar] = await Promise.all([
    olaylariCek(d),
    olaylariCek(oncekiDonem(d)),
  ])

  const metrikler = metrikHesapla(olaylar)
  const onceki = metrikHesapla(oncekiOlaylar)

  // Ürün kırılımı
  const urunHarita = new Map<string, UrunSatiri>()
  const al = (id: string): UrunSatiri => {
    if (!urunHarita.has(id)) {
      urunHarita.set(id, { productId: id, goruntuleme: 0, sepeteEkleme: 0, satis: 0, favori: 0, oran: 0 })
    }
    return urunHarita.get(id)!
  }
  const cihazlar = new Map<string, number>()
  const kaynaklar = new Map<string, number>()
  const aramalar = new Map<string, { adet: number; sonucsuz: number }>()
  const gunluk = new Map<string, { oturumlar: Set<string>; ciro: number }>()

  for (const o of olaylar) {
    if (o.product_id) {
      const s = al(o.product_id)
      if (o.event === 'product_view') s.goruntuleme++
      if (o.event === 'add_to_cart') s.sepeteEkleme++
      if (o.event === 'favorite_add') s.favori++
    }
    if (o.event === 'page_view') {
      cihazlar.set(o.device || 'bilinmiyor', (cihazlar.get(o.device || 'bilinmiyor') || 0) + 1)
      const k = o.referrer_host || 'doğrudan'
      kaynaklar.set(k, (kaynaklar.get(k) || 0) + 1)
    }
    if (o.event === 'search' && o.search_query) {
      const mevcut = aramalar.get(o.search_query) || { adet: 0, sonucsuz: 0 }
      mevcut.adet++
      // meta.sonuc = 0 ise sonuçsuz arama (fırsat: eksik ürün/eşleşme).
      if (Number(o.meta?.sonuc) === 0) mevcut.sonucsuz++
      aramalar.set(o.search_query, mevcut)
    }

    const gun = new Date(o.occurred_at).toLocaleDateString('sv-SE', { timeZone: ISTANBUL })
    if (!gunluk.has(gun)) gunluk.set(gun, { oturumlar: new Set(), ciro: 0 })
    const g = gunluk.get(gun)!
    g.oturumlar.add(o.visitor_id || o.session_id)
    if (o.event === 'purchase') g.ciro += Number(o.value) || 0
  }

  const urunler = [...urunHarita.values()]
    .map((u) => ({ ...u, oran: u.goruntuleme ? Math.round((u.satis / u.goruntuleme) * 10000) / 100 : 0 }))
    .sort((a, b) => b.goruntuleme - a.goruntuleme)
    .slice(0, 20)

  const firsatlar = [...urunHarita.values()]
    .filter((u) => u.sepeteEkleme > 0 && u.satis === 0)
    .sort((a, b) => b.sepeteEkleme - a.sepeteEkleme)
    .slice(0, 10)

  const favoriler = [...urunHarita.values()]
    .filter((u) => u.favori > 0)
    .sort((a, b) => b.favori - a.favori)
    .slice(0, 10)

  const huniAdim = [
    { ad: 'Ürün görüntüleme', adet: metrikler.urunGoruntuleme },
    { ad: 'Sepete ekleme', adet: metrikler.sepeteEkleme },
    { ad: 'Ödemeye başlama', adet: metrikler.odemeBaslama },
    { ad: 'Satın alma', adet: metrikler.siparis },
  ]
  const huni = huniAdim.map((a, i) => ({
    ...a,
    oran: i === 0 ? 100 : huniAdim[0].adet ? Math.round((a.adet / huniAdim[0].adet) * 10000) / 100 : 0,
  }))

  // Rıza oranı: son 500 rıza kaydının kaçı Katman B'ye izin vermiş.
  const supabase = createServiceClient()
  const { data: rizalar } = await supabase
    .from('consent_logs')
    .select('categories')
    .order('occurred_at', { ascending: false })
    .limit(500)
  const toplamRiza = rizalar?.length ?? 0
  const kabul = (rizalar || []).filter((r: any) => r.categories?.analitik_gelismis).length

  return {
    donem: { etiket: d.etiket, baslangic: d.baslangic.toISOString(), bitis: d.bitis.toISOString() },
    metrikler,
    onceki,
    oncekiVeriVar: oncekiOlaylar.length > 0,
    huni,
    urunler,
    firsatlar,
    favoriler,
    cihazlar: [...cihazlar.entries()].map(([ad, adet]) => ({ ad, adet })).sort((a, b) => b.adet - a.adet),
    kaynaklar: [...kaynaklar.entries()].map(([ad, adet]) => ({ ad, adet })).sort((a, b) => b.adet - a.adet).slice(0, 10),
    koleksiyonlar: [],
    aramalar: [...aramalar.entries()]
      .map(([sorgu, v]) => ({ sorgu, adet: v.adet, sonucsuz: v.sonucsuz > 0 }))
      .sort((a, b) => b.adet - a.adet)
      .slice(0, 15),
    seri: [...gunluk.entries()]
      .map(([gun, v]) => ({ gun, ziyaretci: v.oturumlar.size, ciro: Math.round(v.ciro * 100) / 100 }))
      .sort((a, b) => a.gun.localeCompare(b.gun)),
    rizaOrani: toplamRiza ? Math.round((kabul / toplamRiza) * 1000) / 10 : 0,
    katmanBOlay: olaylar.filter((o) => o.visitor_id).length,
  }
}
