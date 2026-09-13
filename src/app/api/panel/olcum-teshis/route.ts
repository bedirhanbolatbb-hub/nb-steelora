import { NextResponse } from 'next/server'
import { adminIstegiMi } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { makineleriBul } from '@/lib/analytics/makine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Ölçüm teşhisi — panelin gösterdiği sayılara güvenilebilir mi?
 *
 * Panelin kendi raporu ölçümü KULLANIR; bu uç ölçümü DENETLER. İkisi ayrı
 * durmalı: rapor "kaç ziyaretçi" der, teşhis "bu sayı nasıl oluştu, nerede
 * sızıntı var" der. Yalnız panel oturumuyla açılır.
 */

type Olay = {
  event: string
  session_id: string
  visitor_id: string | null
  user_id: string | null
  occurred_at: string
  path: string | null
  referrer_host: string | null
  device: string | null
  product_id: string | null
  value: number | null
  order_id: string | null
}

const GUN = 86400000

function istanbulGun(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
}

async function hepsiniCek(gunSayisi: number): Promise<Olay[]> {
  const supabase = createServiceClient()
  const bas = new Date(Date.now() - gunSayisi * GUN).toISOString()
  const hepsi: Olay[] = []
  const adim = 1000
  for (let i = 0; i < 200; i++) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select(
        'event, session_id, visitor_id, user_id, occurred_at, path, referrer_host, device, product_id, value, order_id'
      )
      .gte('occurred_at', bas)
      .order('occurred_at', { ascending: true })
      .range(i * adim, i * adim + adim - 1)
    if (error || !data || data.length === 0) break
    hepsi.push(...(data as Olay[]))
    if (data.length < adim) break
  }
  return hepsi
}

function sayHarita<T>(liste: T[], anahtar: (x: T) => string | null): Record<string, number> {
  const m = new Map<string, number>()
  for (const x of liste) {
    const k = anahtar(x)
    if (k === null) continue
    m.set(k, (m.get(k) || 0) + 1)
  }
  return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40))
}

export async function GET(request: Request) {
  if (!(await adminIstegiMi(request))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const url = new URL(request.url)
  const gunSayisi = Math.min(400, Math.max(1, Number(url.searchParams.get('gun')) || 30))
  const olaylar = await hepsiniCek(gunSayisi)

  // ── Oturum bazlı özet ──
  type OturumOzet = {
    olay: number
    pv: number
    urun: number
    ilk: number
    son: number
    cihaz: Set<string>
    yollar: Set<string>
    kaynak: Set<string>
    vid: Set<string>
    uye: Set<string>
  }
  const oturumlar = new Map<string, OturumOzet>()
  for (const o of olaylar) {
    let s = oturumlar.get(o.session_id)
    if (!s) {
      s = {
        olay: 0,
        pv: 0,
        urun: 0,
        ilk: Infinity,
        son: -Infinity,
        cihaz: new Set(),
        yollar: new Set(),
        kaynak: new Set(),
        vid: new Set(),
        uye: new Set(),
      }
      oturumlar.set(o.session_id, s)
    }
    s.olay++
    if (o.event === 'page_view') s.pv++
    if (o.event === 'product_view') s.urun++
    const t = new Date(o.occurred_at).getTime()
    s.ilk = Math.min(s.ilk, t)
    s.son = Math.max(s.son, t)
    if (o.device) s.cihaz.add(o.device)
    if (o.path) s.yollar.add(o.path)
    if (o.referrer_host) s.kaynak.add(o.referrer_host)
    if (o.visitor_id) s.vid.add(o.visitor_id)
    if (o.user_id) s.uye.add(o.user_id)
  }

  const oturumListesi = [...oturumlar.entries()].map(([id, s]) => ({
    id: id.slice(0, 8),
    olay: s.olay,
    pv: s.pv,
    urun: s.urun,
    tekilYol: s.yollar.size,
    dakika: Math.round(((s.son - s.ilk) / 60000) * 10) / 10,
    cihaz: [...s.cihaz].join(','),
    kaynak: [...s.kaynak].join(','),
    vidSayisi: s.vid.size,
    uyeSayisi: s.uye.size,
  }))

  // ── Gün gün ──
  const gunluk = new Map<
    string,
    { olay: number; oturum: Set<string>; vid: Set<string>; pv: number; urun: number; siparis: number }
  >()
  for (const o of olaylar) {
    const g = istanbulGun(o.occurred_at)
    let d = gunluk.get(g)
    if (!d) {
      d = { olay: 0, oturum: new Set(), vid: new Set(), pv: 0, urun: 0, siparis: 0 }
      gunluk.set(g, d)
    }
    d.olay++
    d.oturum.add(o.session_id)
    d.vid.add(o.visitor_id || o.session_id)
    if (o.event === 'page_view') d.pv++
    if (o.event === 'product_view') d.urun++
    if (o.event === 'purchase') d.siparis++
  }

  // ── Özet tablo ile canlı hesabın karşılaştırması ──
  const supabase = createServiceClient()
  const { data: ozetSatirlari } = await supabase
    .from('analytics_daily')
    .select('day, sessions, visitors, page_views, product_views, purchases, revenue')
    .gte('day', new Date(Date.now() - gunSayisi * GUN).toISOString().slice(0, 10))
    .order('day', { ascending: false })

  const ozetHarita = new Map((ozetSatirlari ?? []).map((r: any) => [r.day, r]))
  const gunSatirlari = [...gunluk.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([gun, d]) => {
      const ozet = ozetHarita.get(gun)
      return {
        gun,
        olay: d.olay,
        canliOturum: d.oturum.size,
        canliVidli: d.vid.size,
        pv: d.pv,
        urun: d.urun,
        siparis: d.siparis,
        ozetOturum: ozet?.sessions ?? null,
        ozetZiyaretci: ozet?.visitors ?? null,
        ozetPv: ozet?.page_views ?? null,
        ayrisma:
          ozet && (ozet.sessions !== d.oturum.size || ozet.page_views !== d.pv) ? 'EVET' : ozet ? 'hayır' : 'özet yok',
      }
    })

  // ── Sızıntı testleri ──
  const pvsizUrunOturumu = oturumListesi.filter((s) => s.pv === 0 && s.urun > 0)
  const tekPvCokUrun = oturumListesi.filter((s) => s.pv === 1 && s.urun >= 3)
  const asiriOturum = oturumListesi.filter((s) => s.olay >= 40).sort((a, b) => b.olay - a.olay).slice(0, 20)
  const cokCihazli = oturumListesi.filter((s) => s.cihaz.includes(','))
  const cokUyeli = oturumListesi.filter((s) => s.uyeSayisi > 1)

  const pvler = olaylar.filter((o) => o.event === 'page_view')

  // ── Tek hareketlik oturumlar gerçek insan mı? ──
  //
  // Gece 02–06 arası insan trafiği neredeyse durur; tarama robotları ise gün
  // boyu eşit dağılır. Tek hareketlik oturumların saat dağılımı düz çıkıyorsa
  // bunlar müşteri değil robottur. Karşılaştırma için çok hareketli
  // oturumların dağılımı da veriliyor.
  const saatDagilimi = (sec: (s: { olay: number }) => boolean) => {
    const kova = new Array(24).fill(0)
    const secili = new Set(oturumListesi.filter(sec).map((s) => s.id))
    for (const o of olaylar) {
      if (!secili.has(o.session_id.slice(0, 8))) continue
      const saat = Number(
        new Intl.DateTimeFormat('tr-TR', {
          timeZone: 'Europe/Istanbul',
          hour: '2-digit',
          hour12: false,
        }).format(new Date(o.occurred_at))
      )
      kova[saat % 24]++
    }
    return kova
  }
  const gece = (k: number[]) => k.slice(2, 7).reduce((a, b) => a + b, 0)
  const toplamK = (k: number[]) => k.reduce((a, b) => a + b, 0) || 1
  const tekHareketSaat = saatDagilimi((s) => s.olay === 1)
  const cokHareketSaat = saatDagilimi((s) => s.olay >= 4)

  const ayiklama = makineleriBul(olaylar)

  // ── Yeni olay adı yazılabiliyor mu? ──
  //
  // analytics_events.event üzerinde bir CHECK kısıtı varsa listede olmayan bir
  // ad reddedilir (23514) ve olay sessizce kaybolur. Tarayıcı doğrulaması için
  // yeni bir olay adı gerekiyor; eklenebilir mi, denenerek öğrenilir. Yazılan
  // satır hemen silinir, ölçüme karışmaz.
  let kisitDurumu = 'bilinmiyor'
  try {
    const deneAd = 'olcum_teshis_deneme'
    const { error } = await supabase
      .from('analytics_events')
      .insert({ event: deneAd, session_id: 'teshis-deneme', device: 'desktop' })
    if (!error) {
      kisitDurumu = 'serbest'
      await supabase.from('analytics_events').delete().eq('session_id', 'teshis-deneme')
    } else {
      kisitDurumu = `kisitli:${error.code ?? ''}`
    }
  } catch {
    kisitDurumu = 'deneme-hatasi'
  }

  return NextResponse.json({
    kisitDurumu,
    makineOzeti: { oturum: ayiklama.oturum, olay: ayiklama.olay },
    saatDagilimi: {
      tekHareket: tekHareketSaat,
      tekHareketGeceOrani: Math.round((gece(tekHareketSaat) / toplamK(tekHareketSaat)) * 1000) / 10,
      cokHareket: cokHareketSaat,
      cokHareketGeceOrani: Math.round((gece(cokHareketSaat) / toplamK(cokHareketSaat)) * 1000) / 10,
      not: 'gece = 02:00–06:59 arası payı (%). Düz dağılım robot işaretidir.',
    },
    pencere: { gun: gunSayisi, olay: olaylar.length, oturum: oturumlar.size },
    ilkOlay: olaylar[0]?.occurred_at ?? null,
    sonOlay: olaylar[olaylar.length - 1]?.occurred_at ?? null,
    olayTipleri: sayHarita(olaylar, (o) => o.event),
    cihazlar: sayHarita(olaylar, (o) => o.device),
    yollar: sayHarita(pvler, (o) => o.path),
    urunYollari: sayHarita(
      olaylar.filter((o) => o.event === 'product_view'),
      (o) => o.path
    ),
    kaynaklar: sayHarita(pvler, (o) => o.referrer_host ?? 'doğrudan'),
    gunler: gunSatirlari,
    sizinti: {
      // Sayfa görüntüleme hiç yazılmadan ürün görüntülenen oturumlar: site içi
      // gezinmede page_view'in düşmediğinin doğrudan kanıtı.
      pvsizUrunOturumu: pvsizUrunOturumu.length,
      pvsizOrnek: pvsizUrunOturumu.slice(0, 10),
      tekPvCokUrun: tekPvCokUrun.length,
      tekPvCokUrunOrnek: tekPvCokUrun.slice(0, 10),
      // Aynı oturum kimliğinde birden çok cihaz/üye: farklı kişiler tek
      // ziyaretçi sayılmış demektir.
      cokCihazliOturum: cokCihazli.length,
      cokUyeliOturum: cokUyeli.length,
      cokUyeliOrnek: cokUyeli.slice(0, 10),
      asiriOturum,
      pvOranlari: {
        oturumBasinaPv: oturumlar.size ? Math.round((pvler.length / oturumlar.size) * 100) / 100 : 0,
        oturumBasinaUrun: oturumlar.size
          ? Math.round(
              (olaylar.filter((o) => o.event === 'product_view').length / oturumlar.size) * 100
            ) / 100
          : 0,
      },
    },
    oturumDagilimi: (() => {
      const kovalar: Record<string, number> = { '1 olay': 0, '2-3': 0, '4-9': 0, '10-29': 0, '30+': 0 }
      for (const s of oturumListesi) {
        if (s.olay === 1) kovalar['1 olay']++
        else if (s.olay <= 3) kovalar['2-3']++
        else if (s.olay <= 9) kovalar['4-9']++
        else if (s.olay <= 29) kovalar['10-29']++
        else kovalar['30+']++
      }
      return kovalar
    })(),
  })
}
