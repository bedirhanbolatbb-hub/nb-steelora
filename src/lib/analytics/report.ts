import { createServiceClient } from '@/lib/supabase/service'

/**
 * Panel raporlama sorguları (Faz 12).
 *
 * Tüm temel metrikler KATMAN A'dan (anonim, rıza gerekmeyen) hesaplanır ki
 * rıza oranından bağımsız olarak tam olsunlar. Yalnız "tekrar gelen ziyaretçi"
 * Katman B'ye dayanır ve panelde bu not düşülür.
 */

export type Donem = { baslangic: Date; bitis: Date; etiket: string }

export const ISTANBUL = 'Europe/Istanbul'

/**
 * Dönem sınırları İstanbul takvimine göre kurulur (Faz 17).
 *
 * Önceki sürümde "bugün/dün/son7" doğru çalışıyordu ama ay ve yıl sınırları
 * (`setDate(1)`, `setMonth(0,1)`) SUNUCUNUN yerel takviminde hesaplanıyordu;
 * Vercel UTC çalıştığı için ayın ilk günü TR'de 02:00'a, yılın ilk günü 2 Ocak
 * 00:00'a kayıyordu. Özel aralıkta da "2026-08-18" metni UTC gece yarısı
 * sayılıp TR 03:00'a düşüyordu — akşam saatlerindeki kayıtlar yanlış güne
 * giriyordu. Artık tüm sınırlar tek bir yerden, İstanbul saatiyle üretiliyor.
 */

/** Verilen anın İstanbul UTC farkı (ms). Yaz saati uygulanırsa da doğru kalır. */
function istanbulOfsetMs(d: Date): number {
  const parca = new Intl.DateTimeFormat('en-US', {
    timeZone: ISTANBUL,
    timeZoneName: 'longOffset',
  })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')?.value // "GMT+03:00"
  const eslesme = /GMT([+-])(\d{2}):(\d{2})/.exec(parca ?? '')
  if (!eslesme) return 3 * 3600000
  const isaret = eslesme[1] === '-' ? -1 : 1
  return isaret * (Number(eslesme[2]) * 3600000 + Number(eslesme[3]) * 60000)
}

/** Verilen anın İstanbul takvimindeki yıl/ay/gün değerleri. */
function istanbulTakvim(d: Date): { yil: number; ay: number; gun: number } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const al = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return { yil: al('year'), ay: al('month'), gun: al('day') }
}

/** İstanbul takvimindeki bir günün 00:00'ı — UTC Date olarak. */
function istanbulGunBasi(yil: number, ay: number, gun: number): Date {
  const kaba = new Date(Date.UTC(yil, ay - 1, gun, 0, 0, 0, 0))
  // Ofset, hedef anın kendisine göre hesaplanır (yaz saati sınırında da doğru).
  return new Date(kaba.getTime() - istanbulOfsetMs(kaba))
}

/** Verilen anın İstanbul gününün 00:00'ı. */
function gunBasi(d: Date): Date {
  const t = istanbulTakvim(d)
  return istanbulGunBasi(t.yil, t.ay, t.gun)
}

/** "YYYY-MM-DD" metnini İstanbul gün başına çevirir (özel aralık girdisi). */
function metindenGunBasi(metin: string): Date | null {
  const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(metin.trim())
  if (!e) return null
  return istanbulGunBasi(Number(e[1]), Number(e[2]), Number(e[3]))
}

export function donemCoz(anahtar: string, ozelBas?: string, ozelBit?: string): Donem {
  const simdi = new Date()
  const bugun = gunBasi(simdi)
  const t = istanbulTakvim(simdi)
  const gun = 86400000

  switch (anahtar) {
    case 'dun':
      return { baslangic: new Date(bugun.getTime() - gun), bitis: bugun, etiket: 'Dün' }
    case 'son7':
      return { baslangic: new Date(bugun.getTime() - 6 * gun), bitis: simdi, etiket: 'Son 7 gün' }
    case 'son30':
      return { baslangic: new Date(bugun.getTime() - 29 * gun), bitis: simdi, etiket: 'Son 30 gün' }
    case 'buay':
      return { baslangic: istanbulGunBasi(t.yil, t.ay, 1), bitis: simdi, etiket: 'Bu ay' }
    case 'gecenay': {
      const oncekiAy = t.ay === 1 ? 12 : t.ay - 1
      const oncekiYil = t.ay === 1 ? t.yil - 1 : t.yil
      return {
        baslangic: istanbulGunBasi(oncekiYil, oncekiAy, 1),
        bitis: istanbulGunBasi(t.yil, t.ay, 1),
        etiket: 'Geçen ay',
      }
    }
    case 'buyil':
      return { baslangic: istanbulGunBasi(t.yil, 1, 1), bitis: simdi, etiket: 'Bu yıl' }
    case 'ozel': {
      const b = (ozelBas && metindenGunBasi(ozelBas)) || new Date(bugun.getTime() - 6 * gun)
      const bitGun = ozelBit && metindenGunBasi(ozelBit)
      // Bitiş günü aralığa DAHİL: ertesi günün 00:00'ına kadar.
      const s = bitGun ? new Date(bitGun.getTime() + gun) : simdi
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
  /**
   * GÜNLÜK TEKİL ZİYARETÇİ. Çerezsiz Katman A'da kimlik günlük tuzla
   * hesaplanır: aynı kişinin sabahki ve akşamki ziyareti AYNI kimliğe düşer.
   * Bu yüzden metriğin adı "oturum" değil — bir günde kaç FARKLI kişi
   * geldiğini sayar, kaç kez geldiğini değil.
   */
  ziyaretci: number
  sayfaGoruntuleme: number
  /**
   * Aynı gün içinde ilk ve son hareket arası (saniye), 30 dakikayla
   * KIRPILMIŞ. Kimlik günlük olduğu için kırpma olmadan "145 dakika" gibi
   * anlamsız değerler çıkıyordu; sabah bakıp akşam dönen kişinin arası
   * ziyaret süresi değildir.
   */
  ortAktiflikSaniye: number
  urunGoruntuleme: number
  sepeteEkleme: number
  favori: number
  uyelik: number
  odemeBaslama: number
  /** İptal/iade edilmemiş sipariş adedi. */
  siparis: number
  /** İptal/iade edilmiş sipariş adedi — ayrı gösterilir. */
  iptalIade: number
  /** Tahsil edilen toplam (iptal/iade dahil). */
  brutCiro: number
  /** İptal ve iadeler düşülmüş ciro — panelde asıl gösterilen. */
  ciro: number
  donusumOrani: number
  sepeteEklemeOrani: number
  sepettenOdemeOrani: number
}

/** Ziyaret süresi kırpma sınırı — bkz. ortAktiflikSaniye. */
const AKTIFLIK_TAVANI_SN = 30 * 60

/**
 * @param iptalEdilenSiparisler İptal/iade edilmiş sipariş kimlikleri. Ciro ve
 *   sipariş sayısı bunları saymaz — panel iptal edilmiş tek siparişi ciro diye
 *   gösteriyordu (₺664,86), oysa parası iade edilmişti.
 */
/**
 * Purchase olaylarına bağlı siparişlerden İPTAL ya da İADE edilmiş olanların
 * kimlikleri. Ölçüm olayı satın alma anında yazılır; siparişin sonradan iptal
 * edilmesi olayı geri almaz, bu yüzden durum sipariş tablosundan okunur.
 */
async function iptalEdilenSiparisKimlikleri(olaylar: HamOlay[]): Promise<Set<string>> {
  const kimlikler = [...new Set(olaylar.filter((o) => o.event === 'purchase' && o.order_id).map((o) => o.order_id as string))]
  if (kimlikler.length === 0) return new Set()
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_refunded_at')
      .in('id', kimlikler)
    return new Set(
      (data ?? [])
        .filter((o: any) => o.status === 'cancelled' || o.status === 'refunded' || o.payment_refunded_at)
        .map((o: any) => o.id as string)
    )
  } catch {
    // Durum okunamazsa ciro OLDUĞU GİBİ kalır; sessizce sıfırlamak daha kötü.
    return new Set()
  }
}

function metrikHesapla(olaylar: HamOlay[], iptalEdilenSiparisler: Set<string> = new Set()): Metrikler {
  const ziyaretciler = new Set<string>()
  const aktiflik = new Map<string, { ilk: number; son: number }>()
  let sayfa = 0, urun = 0, sepet = 0, favori = 0, uyelik = 0, odeme = 0
  let siparis = 0, iptalIade = 0, ciro = 0, brutCiro = 0

  for (const o of olaylar) {
    // TEK KİMLİK UZAYI. Eskiden `visitor_id || session_id` iki ayrı uzayı bir
    // kümede topluyordu: aynı kişinin rıza öncesi (visitor_id yok) ve rıza
    // sonrası (visitor_id var) olayları İKİ ziyaretçi sayılıyor, bu yüzden
    // "tekil ziyaretçi > oturum" gibi imkânsız bir sonuç çıkıyordu
    // (canlı veride 355 > 350; 9 oturumda her iki tür olay birden vardı).
    // Artık herkes session_id ile sayılır — Katman A'da kimlik zaten günlük
    // tekil kişidir; visitor_id yalnız üye kırılımı için kullanılır.
    ziyaretciler.add(o.session_id)

    const t = new Date(o.occurred_at).getTime()
    const mevcut = aktiflik.get(o.session_id)
    if (!mevcut) aktiflik.set(o.session_id, { ilk: t, son: t })
    else aktiflik.set(o.session_id, { ilk: Math.min(mevcut.ilk, t), son: Math.max(mevcut.son, t) })

    switch (o.event) {
      case 'page_view': sayfa++; break
      case 'product_view': urun++; break
      case 'add_to_cart': sepet++; break
      case 'favorite_add': favori++; break
      case 'signup': uyelik++; break
      case 'begin_checkout': odeme++; break
      case 'purchase': {
        const tutar = Number(o.value) || 0
        brutCiro += tutar
        if (o.order_id && iptalEdilenSiparisler.has(o.order_id)) {
          iptalIade++
        } else {
          siparis++
          ciro += tutar
        }
        break
      }
    }
  }

  const sureler = [...aktiflik.values()]
    .map((s) => Math.min((s.son - s.ilk) / 1000, AKTIFLIK_TAVANI_SN))
    .filter((s) => s > 0)
  const ortSure = sureler.length ? sureler.reduce((a, b) => a + b, 0) / sureler.length : 0

  const ziyaretciSayisi = ziyaretciler.size
  return {
    ziyaretci: ziyaretciSayisi,
    sayfaGoruntuleme: sayfa,
    ortAktiflikSaniye: Math.round(ortSure),
    urunGoruntuleme: urun,
    sepeteEkleme: sepet,
    favori,
    uyelik,
    odemeBaslama: odeme,
    siparis,
    iptalIade,
    brutCiro: Math.round(brutCiro * 100) / 100,
    ciro: Math.round(ciro * 100) / 100,
    // Dönüşüm de iptal edilmiş siparişi saymaz.
    donusumOrani: ziyaretciSayisi ? Math.round((siparis / ziyaretciSayisi) * 10000) / 100 : 0,
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

  // İptal/iade edilmiş siparişler ciroyu ve dönüşümü şişirmesin (Faz 23).
  // Panel iptal edilmiş tek siparişi ₺664,86 ciro diye gösteriyordu.
  const iptalEdilenler = await iptalEdilenSiparisKimlikleri([...olaylar, ...oncekiOlaylar])
  const metrikler = metrikHesapla(olaylar, iptalEdilenler)
  const onceki = metrikHesapla(oncekiOlaylar, iptalEdilenler)

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
