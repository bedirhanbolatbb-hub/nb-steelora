/**
 * Otomatik fatura işi — Trendyol siparişleri için e-Arşiv TASLAĞI açar; BB'nin
 * imzaladığı faturaları Trendyol'a yükler (14 Kas 2026'dan, yukleme.ts).
 *
 * Akış: Trendyol'dan son 13 günün paketleri → GİB'de son 21 günün belgeleri
 * (nottaki sipariş numarasıyla eşlenir, harita.ts) → faturası olmayan uygun
 * siparişlere taslak → imzalanmış ve henüz yüklenmemiş olanları yükleme.
 * İmza BB'de: e-Arşiv Portal, Düzenlenen Belgeler, GİB İmza (tek SMS).
 *
 * Uygun sipariş: BB'nin tarifiyle "yeni, işleme alınan, taşıma durumunda ve
 * teslim edilen" (trendyolSiparis.ts KESILECEK). İptal/iade olanlara fatura
 * açılmaz, yüklenmez; faturası varsa BB'ye bildirilir.
 *
 * Mükerrer koruması iki katlı:
 *  1. GİB'deki HER belge (taslak, imzalı, silinmiş, iptal) sayılır: notunda
 *     sipariş numarası geçen siparişe bir daha fatura açılmaz. BB'nin
 *     sildiği taslak da geri açılmaz — silmek "istemiyorum" demektir.
 *  2. Tur kalıcı kilitle tekleşir (alert_state'te `fatura_kilit` satırı;
 *     bellek içi kilit Vercel'de çalışmaz). Kilit taramadan ÖNCE alınır ki
 *     iki tur aynı boşluğu görüp ikisi birden kesmesin ya da yüklemesin.
 * Bir belgenin notu okunamazsa tur hiç iş yapmadan biter (kapalı başarısızlık).
 *
 * Yükleme yalnız açıkça istendiğinde çalışır (`yukle`): cron'da yükleme
 * anahtarı (anahtar.ts) açıksa, panelden POST ?yukle=evet. Önizleme
 * yükleneceklerin listesini gösterir, hiçbir şey yazmaz.
 *
 * Süre: rota 60 sn ile sınırlı; yeni yükleme SURE_PAYI_MS dolduktan sonra
 * başlatılmaz, kalan sonraki tura kalır.
 *
 * Kişisel veri loglanmaz: sonuçta yalnız sipariş/paket/belge numarası, tutar,
 * ürün adı ve hata metni var; alıcı adı ve adresi yalnız GİB'e gider.
 */
import { createServiceClient } from '@/lib/supabase/service'
import { faturaOlustur, gibCikis, gibGiris, istanbulSimdi, type GibOturum } from './gib'
import { faturaHaritasi, GIB_GUNU } from './harita'
import type { GibKaydi } from './eslesme'
import { taslakHazirla, type FaturaTuru, type TrendyolPaket } from './taslak'
import { DONEN, KESILECEK, paketDurumu, sonPaketler } from './trendyolSiparis'
import { imzalilariYukle, type YuklemeSonucu } from './yukleme'

const SIPARIS_GUNU = 13
const TUR_BASINA_EN_FAZLA = 20
const KILIT = 'fatura_kilit'
const KILIT_OMRU_MS = 10 * 60_000
const SURE_PAYI_MS = 40_000

export interface FaturaIsiSonucu {
  kip: 'onizleme' | 'kes'
  zaman: string
  paket: number
  gib: 'bağlandı' | 'bilgi yok' | 'hata'
  mevcut: number
  kesilecek: { siparis: string; tur: FaturaTuru; tutar: number; urunler: string[] }[]
  kesildi: { siparis: string; tur: FaturaTuru; tutar: number; belge: string | null }[]
  yukleme: 'kapalı' | 'önizleme' | 'açık'
  imzaBekleyen: number
  imzaDenetimi: YuklemeSonucu['imzaDenetimi']
  yuklenecek: YuklemeSonucu['yuklenecek']
  yuklendi: YuklemeSonucu['yuklendi']
  elle: { siparis: string; neden: string }[]
  uyari: { siparis: string; durum: string; belge: string; onay: string }[]
  hatalar: string[]
}

const mesaj = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 240)
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function kilitAl(): Promise<string | null> {
  const db = createServiceClient()
  const simdi = new Date().toISOString()
  await db.from('alert_state').upsert(
    { key: KILIT, fingerprint: 'fatura', last_sent_at: '2000-01-01T00:00:00Z', count: 0, first_seen_at: simdi, updated_at: simdi },
    { onConflict: 'key', ignoreDuplicates: true }
  )
  const { data, error } = await db
    .from('alert_state')
    .update({ last_sent_at: simdi, updated_at: simdi })
    .eq('key', KILIT)
    .lt('last_sent_at', new Date(Date.now() - KILIT_OMRU_MS).toISOString())
    .select('key')
  if (error) throw new Error(`fatura kilidi alınamadı: ${error.message}`)
  return data?.length ? simdi : null
}

async function kilitBirak(damga: string): Promise<void> {
  try {
    await createServiceClient()
      .from('alert_state')
      .update({ last_sent_at: '2000-01-01T00:00:00Z' })
      .eq('key', KILIT)
      .eq('last_sent_at', damga)
  } catch {
    /* kilit kendi ömrüyle düşer */
  }
}

export async function faturaIsi(
  kip: 'onizleme' | 'kes',
  secenek: { yukle?: boolean } = {}
): Promise<FaturaIsiSonucu> {
  const basla = Date.now()
  const an = istanbulSimdi()
  const yukle = kip === 'kes' && secenek.yukle === true
  const s: FaturaIsiSonucu = {
    kip,
    zaman: `${an.tarih} ${an.saat}`,
    paket: 0,
    gib: 'bilgi yok',
    mevcut: 0,
    kesilecek: [],
    kesildi: [],
    yukleme: kip === 'onizleme' ? 'önizleme' : yukle ? 'açık' : 'kapalı',
    imzaBekleyen: 0,
    imzaDenetimi: [],
    yuklenecek: [],
    yuklendi: [],
    elle: [],
    uyari: [],
    hatalar: [],
  }

  const kullanici = process.env.GIB_KULLANICI?.trim()
  const sifre = process.env.GIB_SIFRE?.trim()
  if (kip === 'kes' && !(kullanici && sifre)) {
    s.hatalar.push('GİB giriş bilgisi tanımlı değil (GIB_KULLANICI, GIB_SIFRE)')
    return s
  }

  let oturum: GibOturum | null = null
  let kilit: string | null = null
  try {
    if (kip === 'kes') {
      kilit = await kilitAl()
      if (!kilit) {
        s.hatalar.push('başka bir fatura turu sürüyor; bu tur atlandı')
        return s
      }
    }

    const paketler = await sonPaketler(SIPARIS_GUNU)
    s.paket = paketler.length

    const adaylar = new Map<string, TrendyolPaket>()
    const coklu = new Set<string>()
    const donenler: TrendyolPaket[] = []
    for (const p of paketler) {
      const durum = paketDurumu(p)
      const no = String(p.orderNumber)
      if (DONEN.has(durum)) donenler.push(p)
      else if (KESILECEK.has(durum) && !p.invoiceLink) {
        if (adaylar.has(no)) coklu.add(no)
        else adaylar.set(no, p)
      }
    }

    let gibKayitlari = { harita: new Map<string, GibKaydi[]>(), ettnler: new Set<string>() }
    if (kullanici && sifre) {
      try {
        oturum = await gibGiris(kullanici, sifre)
      } catch (e) {
        s.gib = 'hata'
        throw e
      }
      s.gib = 'bağlandı'
      gibKayitlari = await faturaHaritasi(oturum, GIB_GUNU)
    }
    const mevcut = gibKayitlari.harita

    const isler: { no: string; tur: FaturaTuru; toplam: number; jp: Record<string, unknown> }[] = []
    for (const [no, p] of adaylar) {
      if (mevcut.has(no)) {
        s.mevcut++
        continue
      }
      if (coklu.has(no)) {
        s.elle.push({ siparis: no, neden: 'siparişin birden çok paketi var' })
        continue
      }
      const t = taslakHazirla(p, an)
      if (!t.tamam) {
        s.elle.push({ siparis: no, neden: t.neden })
        continue
      }
      s.kesilecek.push({ siparis: no, tur: t.tur, tutar: t.toplam, urunler: t.urunler })
      isler.push({ no, tur: t.tur, toplam: t.toplam, jp: t.jp })
    }
    for (const p of donenler) {
      const no = String(p.orderNumber)
      const kayit = mevcut.get(no)?.[0]
      if (kayit) s.uyari.push({ siparis: no, durum: paketDurumu(p), belge: kayit.belge, onay: kayit.onay })
    }

    if (!oturum) return s

    // Taslaklar.
    if (kip === 'kes' && isler.length) {
      for (const is of isler.slice(0, TUR_BASINA_EN_FAZLA)) {
        try {
          await faturaOlustur(oturum, is.jp)
          s.kesildi.push({ siparis: is.no, tur: is.tur, tutar: is.toplam, belge: null })
        } catch (e) {
          s.hatalar.push(`${is.no}: ${mesaj(e)}`)
        }
        await bekle(400)
      }
      if (isler.length > TUR_BASINA_EN_FAZLA) {
        s.hatalar.push(`${isler.length - TUR_BASINA_EN_FAZLA} sipariş bir sonraki tura kaldı`)
      }
      // Yeni taslakların belge numaraları — yalnız bugünün yeni belgeleri okunur.
      if (s.kesildi.length) {
        try {
          const yeni = await faturaHaritasi(oturum, 1, gibKayitlari.ettnler)
          for (const k of s.kesildi) k.belge = yeni.harita.get(k.siparis)?.[0]?.belge ?? null
        } catch {
          /* numara eşlenemese de taslaklar açıldı; özet yine gider */
        }
      }
    }

    // İmzalılar → Trendyol (önizlemede yalnız liste).
    if (kip === 'onizleme' || yukle) {
      const y = await imzalilariYukle({
        kip,
        oturum,
        adaylar,
        coklu,
        belgeler: mevcut,
        sureSonu: basla + SURE_PAYI_MS,
      })
      s.imzaBekleyen = y.imzaBekleyen
      s.imzaDenetimi = y.imzaDenetimi
      s.yuklenecek = y.yuklenecek
      s.yuklendi = y.yuklendi
      s.elle.push(...y.elle)
      s.hatalar.push(...y.hatalar)
    }
    return s
  } catch (e) {
    s.hatalar.push(mesaj(e))
    return s
  } finally {
    if (oturum) await gibCikis(oturum)
    if (kilit) await kilitBirak(kilit)
  }
}
