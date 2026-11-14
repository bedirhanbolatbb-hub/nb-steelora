/**
 * İmzalı faturaları Trendyol'a yükleme (14 Kas 2026). BB: "imza sonrası
 * Trendyol'a yüklemeyi de yap ... yanlış siparişe yanlış fatura yüklemek çok
 * büyük cezalara gider ... çok hassas davran".
 *
 * Her sipariş için (tur başına en çok TUR_BASINA_YUKLEME):
 *  1. Siparişi anan TEK bir GİB belgesi olmalı ve imzalı olmalı. İmzalı yoksa
 *     "imza bekliyor" sayılır; birden çok belge varsa elle.
 *  2. eslesme.ts: belge ↔ paket alan alan (alıcı, kimlik no, kalemler, tutar,
 *     tarih, nottaki tek sipariş no).
 *  3. GİB görüntüsü (HTML) okunur; içinde belge no ve ETTN geçmeli.
 *     — önizleme burada durur, hiçbir şey yazılmaz —
 *  4. Trendyol'dan sipariş TAZE okunur: tek paket, aynı paket no, faturası
 *     yok, uygun durum; denetim taze paketle YENİDEN yapılır.
 *  5. Görüntü özel depoya yazılır ve bağlantı sitenin kendisinden açılıp
 *     denenir (200 + belge no). Açılmazsa silinir, Trendyol'a gitmez.
 *  6. Bağlantı Trendyol'a gider. 409 (pakete daha önce fatura verilmiş) ya da
 *     ret → görüntü silinir. Belirsiz (zaman aşımı) → kalır, BB'ye yazılır.
 *  7. Trendyol'dan yeniden okunur: paketteki bağlantı bizimki mi.
 * Herhangi bir adımda şüphe → yükleme yok, BB'ye "elle" satırı.
 *
 * Kişisel veri loglanmaz: sonuçta yalnız sipariş/paket/belge no ve tutar.
 */
import { SITE_URL } from '@/lib/seo'
import { faturaGoruntusu, gibCikis, gibGiris, type GibOturum } from './gib'
import { goruntuBelgeyleUyumlu, IMZALI, yuklemeDenetimi, type GibKaydi } from './eslesme'
import { faturaHaritasi, GIB_GUNU } from './harita'
import { goruntuyuSakla, goruntuyuSil, kaydiOku } from './depo'
import { faturaBaglantisiGonder, faturaBaglantisiSil } from './trendyolFatura'
import { KESILECEK, paketDurumu, siparisPaketleri } from './trendyolSiparis'
import type { TrendyolPaket } from './taslak'

export const TUR_BASINA_YUKLEME = 10

export interface YuklemeSonucu {
  imzaBekleyen: number
  /** Yalnız önizleme: imza bekleyen taslaklar imzalansa denetimden geçer mi. */
  imzaDenetimi: { siparis: string; belge: string; sonuc: string }[]
  yuklenecek: { siparis: string; paket: number; belge: string; tutar: number }[]
  yuklendi: { siparis: string; paket: number; belge: string; tutar: number; dogrulandi: boolean }[]
  elle: { siparis: string; neden: string }[]
  hatalar: string[]
}

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms))
const mesaj = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 240)

export const baglanti = (anahtar: string) => `${SITE_URL}/fatura/${anahtar}`

/** Yayımlanan sayfa gerçekten açılıyor mu — Trendyol'a vermeden önce. */
async function baglantiAciliyor(link: string, belge: string): Promise<boolean> {
  try {
    const y = await fetch(link, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15_000) })
    return y.status === 200 && (await y.text()).includes(belge)
  } catch {
    return false
  }
}

/** Önizleme: taslak imzalansaydı yüklemenin bütün denetimlerinden geçer miydi. */
async function imzasizDenetim(
  oturum: GibOturum,
  no: string,
  paket: TrendyolPaket,
  kayitlar: GibKaydi[],
  coklu: Set<string>
): Promise<{ siparis: string; belge: string; sonuc: string }> {
  const belge = kayitlar.map((k) => k.belge).join(', ')
  if (kayitlar.length !== 1) return { siparis: no, belge, sonuc: 'siparişi anan birden çok e-Arşiv belgesi var' }
  if (coklu.has(no)) return { siparis: no, belge, sonuc: 'siparişin birden çok paketi var' }
  const k = kayitlar[0]
  const d = yuklemeDenetimi(paket, k, new Date(), false)
  if (!d.tamam) return { siparis: no, belge, sonuc: d.neden }
  try {
    const html = await faturaGoruntusu(oturum, k.ettn, k.onay)
    if (!goruntuBelgeyleUyumlu(html, k.belge, k.ettn)) return { siparis: no, belge, sonuc: 'fatura görüntüsü belgeyle eşleşmedi' }
  } catch (e) {
    return { siparis: no, belge, sonuc: `görüntü okunamadı: ${mesaj(e)}` }
  }
  return { siparis: no, belge, sonuc: 'geçiyor' }
}

export async function imzalilariYukle(g: {
  kip: 'onizleme' | 'kes'
  oturum: GibOturum
  adaylar: Map<string, TrendyolPaket>
  coklu: Set<string>
  belgeler: Map<string, GibKaydi[]>
  /** Bu andan sonra yeni yükleme başlatılmaz (rota süre sınırı). */
  sureSonu: number
}): Promise<YuklemeSonucu> {
  const s: YuklemeSonucu = { imzaBekleyen: 0, imzaDenetimi: [], yuklenecek: [], yuklendi: [], elle: [], hatalar: [] }
  const elle = (siparis: string, neden: string) => s.elle.push({ siparis, neden: `yükleme: ${neden}` })
  let yapilan = 0

  const sirali = [...g.adaylar.entries()].sort((a, b) => Number(a[1].orderDate ?? 0) - Number(b[1].orderDate ?? 0))
  for (const [no, paket] of sirali) {
    const kayitlar = g.belgeler.get(no) ?? []
    if (!kayitlar.length) continue
    if (!kayitlar.some((k) => k.onay === IMZALI)) {
      s.imzaBekleyen++
      if (g.kip === 'onizleme') s.imzaDenetimi.push(await imzasizDenetim(g.oturum, no, paket, kayitlar, g.coklu))
      continue
    }
    if (kayitlar.length !== 1) {
      elle(no, 'siparişi anan birden çok e-Arşiv belgesi var')
      continue
    }
    if (g.coklu.has(no)) {
      elle(no, 'siparişin birden çok paketi var')
      continue
    }
    const kayit = kayitlar[0]
    const denetim = yuklemeDenetimi(paket, kayit, new Date())
    if (!denetim.tamam) {
      elle(no, denetim.neden)
      continue
    }
    if (g.kip === 'kes' && (yapilan >= TUR_BASINA_YUKLEME || Date.now() > g.sureSonu)) {
      s.hatalar.push(`${no}: bu turun yükleme sınırı doldu; sonraki tura kaldı`)
      continue
    }

    let html: string
    try {
      html = await faturaGoruntusu(g.oturum, kayit.ettn, kayit.onay)
    } catch (e) {
      s.hatalar.push(`${no}: ${mesaj(e)}`)
      continue
    }
    if (!goruntuBelgeyleUyumlu(html, kayit.belge, kayit.ettn)) {
      elle(no, 'fatura görüntüsü belgeyle eşleşmedi')
      continue
    }

    if (g.kip === 'onizleme') {
      s.yuklenecek.push({ siparis: no, paket: Number(paket.id), belge: kayit.belge, tutar: denetim.tutar })
      continue
    }
    yapilan++

    // 4. Taze bakış ve yeniden denetim.
    let taze: TrendyolPaket[]
    try {
      taze = await siparisPaketleri(no, paket.orderDate)
    } catch (e) {
      s.hatalar.push(`${no}: ${mesaj(e)}`)
      continue
    }
    if (taze.length !== 1) {
      elle(no, `Trendyol'da siparişin ${taze.length} paketi görünüyor`)
      continue
    }
    const t = taze[0]
    if (Number(t.id) !== Number(paket.id)) {
      elle(no, 'paket numarası değişmiş')
      continue
    }
    if (t.invoiceLink) continue // bu arada faturası yüklenmiş
    if (!KESILECEK.has(paketDurumu(t))) {
      elle(no, `paket durumu ${paketDurumu(t)}`)
      continue
    }
    const son = yuklemeDenetimi(t, kayit, new Date())
    if (!son.tamam) {
      elle(no, son.neden)
      continue
    }

    // 5. Sakla ve sitenin kendisinden aç.
    let anahtar: string
    try {
      anahtar = await goruntuyuSakla(html, {
        siparis: no,
        siparisZamani: Number(t.orderDate ?? 0),
        paket: Number(t.id),
        belge: kayit.belge,
        ettn: kayit.ettn,
        tutar: son.tutar,
        zaman: new Date().toISOString(),
      })
    } catch (e) {
      s.hatalar.push(`${no}: ${mesaj(e)}`)
      continue
    }
    const link = baglanti(anahtar)
    if (!(await baglantiAciliyor(link, kayit.belge))) {
      await goruntuyuSil(anahtar)
      s.hatalar.push(`${no}: fatura sayfası sitede açılmadı; Trendyol'a gönderilmedi`)
      continue
    }

    // 6. Gönder.
    const sonuc = await faturaBaglantisiGonder({
      link,
      paketId: Number(t.id),
      faturaZamani: son.faturaZamani,
      belgeNumarasi: son.belgeNumarasi,
    })
    if (sonuc.durum === 'zaten') {
      await goruntuyuSil(anahtar)
      elle(no, `Trendyol pakete daha önce fatura verildiğini bildirdi (${sonuc.mesaj})`)
      continue
    }
    if (sonuc.durum === 'hata') {
      await goruntuyuSil(anahtar)
      s.hatalar.push(`${no}: Trendyol reddetti — ${sonuc.mesaj}`)
      continue
    }
    if (sonuc.durum === 'belirsiz') {
      s.hatalar.push(`${no}: Trendyol'un cevabı belirsiz (${sonuc.mesaj}); sonraki tur kontrol eder`)
      continue
    }

    // 7. Doğrula.
    await bekle(1000)
    let dogrulandi = false
    try {
      const sonra = await siparisPaketleri(no, paket.orderDate)
      dogrulandi = sonra.length === 1 && sonra[0].invoiceLink === link
    } catch {
      /* sonraki tur görür */
    }
    s.yuklendi.push({ siparis: no, paket: Number(t.id), belge: kayit.belge, tutar: son.tutar, dogrulandi })
    await bekle(400)
  }
  return s
}

/**
 * Acil geri alma: görüntüyü siler (bağlantı o an 404) ve Trendyol'daki
 * bağlantıyı kaldırır — yalnız paketteki bağlantı gerçekten bizimkiyse.
 */
export async function yuklemeyiGeriAl(anahtar: string): Promise<{ tamam: boolean; adimlar: string[] }> {
  const adimlar: string[] = []
  const kayit = await kaydiOku(anahtar)
  if (!kayit) return { tamam: false, adimlar: ['bu anahtarla kayıt yok'] }
  const silindi = await goruntuyuSil(anahtar)
  adimlar.push(silindi ? 'görüntü silindi, bağlantı artık açılmıyor' : 'görüntü silinemedi')

  let paketler: TrendyolPaket[] = []
  try {
    paketler = await siparisPaketleri(kayit.siparis, kayit.siparisZamani)
  } catch (e) {
    adimlar.push(`Trendyol okunamadı: ${mesaj(e)}`)
  }
  const p = paketler.find((x) => Number(x.id) === kayit.paket)
  if (!p) {
    adimlar.push('Trendyol paketi bulunamadı; bağlantı panelden kaldırılmalı')
    return { tamam: false, adimlar }
  }
  if (p.invoiceLink !== baglanti(anahtar)) {
    adimlar.push('paketteki fatura bağlantısı bizimki değil; Trendyol\'a dokunulmadı')
    return { tamam: silindi, adimlar }
  }
  const sil = await faturaBaglantisiSil(Number(p.id), Number(p.customerId))
  adimlar.push(sil.tamam ? 'Trendyol bağlantısı kaldırıldı' : `Trendyol bağlantısı kaldırılamadı: ${sil.mesaj}`)
  return { tamam: silindi && sil.tamam, adimlar }
}

/**
 * Panel önizlemesi: bir siparişin yüklenecek görüntüsünü, aynı denetimlerden
 * geçirerek gösterir. İmza şartı burada yok (taslağın görüntüsüne de
 * bakılabilsin); hiçbir şey yazmaz, Trendyol'a gitmez.
 */
export async function goruntuOnizlemesi(siparisNo: string): Promise<{ html: string } | { hata: string }> {
  if (!/^\d{8,}$/.test(siparisNo)) return { hata: 'geçersiz sipariş numarası' }
  const kullanici = process.env.GIB_KULLANICI?.trim()
  const sifre = process.env.GIB_SIFRE?.trim()
  if (!kullanici || !sifre) return { hata: 'GİB giriş bilgisi tanımlı değil' }
  let oturum: GibOturum | null = null
  try {
    const paketler = await siparisPaketleri(siparisNo)
    if (paketler.length !== 1) return { hata: `Trendyol'da siparişin ${paketler.length} paketi görünüyor` }
    oturum = await gibGiris(kullanici, sifre)
    const { harita } = await faturaHaritasi(oturum, GIB_GUNU)
    const kayitlar = harita.get(siparisNo) ?? []
    if (kayitlar.length !== 1) return { hata: `siparişi anan ${kayitlar.length} e-Arşiv belgesi var` }
    const k = kayitlar[0]
    const d = yuklemeDenetimi(paketler[0], k, new Date(), false)
    if (!d.tamam) return { hata: d.neden }
    const html = await faturaGoruntusu(oturum, k.ettn, k.onay)
    if (!goruntuBelgeyleUyumlu(html, k.belge, k.ettn)) return { hata: 'görüntü belgeyle eşleşmedi' }
    return { html }
  } catch (e) {
    return { hata: mesaj(e) }
  } finally {
    if (oturum) await gibCikis(oturum)
  }
}
