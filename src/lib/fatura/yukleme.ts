/**
 * İmzalı faturaları Trendyol'a PDF olarak yükleme (14 Kas 2026). BB: "imza
 * sonrası Trendyol'a yüklemeyi de yap ... yanlış siparişe yanlış fatura
 * yüklemek çok büyük cezalara gider ... çok hassas davran"; aynı gün: bağlantı
 * yerine PDF (BB'nin elle yaptığı gibi; Trendyol dosyayı kendisi saklar).
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
 *  5. PDF üretilir (pdf.ts): karekod çizilmiş, görünen metinde belge no ve
 *     ETTN var, gerçekten PDF, makul boy ve sayfa. Olmazsa yüklenmez.
 *  6. PDF Trendyol'a gider. "Daha önce gönderilmiş" → elle. Ret → hata.
 *     Belirsiz (zaman aşımı) → sonraki tur pakete bakar.
 *  7. Trendyol'dan yeniden okunur: pakette fatura görünüyor mu.
 * Trendyol'a giden PDF'yi geri alan bir uç yok; şüphede yükleme yapılmaz,
 * BB'ye "elle" satırı yazılır.
 *
 * Kişisel veri loglanmaz: sonuçta yalnız sipariş/paket/belge no ve tutar.
 */
import type { Browser } from 'puppeteer-core'
import { faturaGoruntusu, gibCikis, gibGiris, type GibOturum } from './gib'
import { goruntuBelgeyleUyumlu, IMZALI, yuklemeDenetimi, type GibKaydi } from './eslesme'
import { faturaHaritasi, GIB_GUNU } from './harita'
import { faturaPdf, pdfTarayicisiAc, pdfTarayicisiKapat } from './pdf'
import { faturaDosyasiGonder } from './trendyolFatura'
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
  let tarayici: Browser | null = null

  try {
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

      // 5. PDF.
      let pdf: Buffer
      try {
        tarayici ??= await pdfTarayicisiAc()
        pdf = await faturaPdf(tarayici, html, kayit.belge, kayit.ettn)
      } catch (e) {
        s.hatalar.push(`${no}: PDF üretilemedi — ${mesaj(e)}; yüklenmedi`)
        continue
      }

      // 6. Gönder.
      const sonuc = await faturaDosyasiGonder({
        pdf,
        dosyaAdi: `${no}.pdf`,
        paketId: Number(t.id),
        belgeNumarasi: son.belgeNumarasi,
        faturaZamani: son.faturaZamani,
        mikro: String(kayit.detay.faturaTipi ?? '') === 'ISTISNA',
      })
      if (sonuc.durum === 'zaten') {
        elle(no, `Trendyol pakete daha önce fatura verildiğini bildirdi (${sonuc.mesaj})`)
        continue
      }
      if (sonuc.durum === 'hata') {
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
        dogrulandi = sonra.length === 1 && !!sonra[0].invoiceLink
      } catch {
        /* sonraki tur görür */
      }
      s.yuklendi.push({ siparis: no, paket: Number(t.id), belge: kayit.belge, tutar: son.tutar, dogrulandi })
      await bekle(400)
    }
  } finally {
    await pdfTarayicisiKapat(tarayici)
  }
  return s
}

/**
 * Panel önizlemesi: bir siparişin Trendyol'a gidecek PDF'si, aynı
 * denetimlerden geçirilerek. İmza şartı burada yok (taslağın PDF'sine de
 * bakılabilsin); hiçbir şey yazmaz, Trendyol'a gitmez.
 */
export async function pdfOnizlemesi(siparisNo: string): Promise<{ pdf: Buffer; dosyaAdi: string } | { hata: string }> {
  if (!/^\d{8,}$/.test(siparisNo)) return { hata: 'geçersiz sipariş numarası' }
  const kullanici = process.env.GIB_KULLANICI?.trim()
  const sifre = process.env.GIB_SIFRE?.trim()
  if (!kullanici || !sifre) return { hata: 'GİB giriş bilgisi tanımlı değil' }
  let oturum: GibOturum | null = null
  let tarayici: Browser | null = null
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
    tarayici = await pdfTarayicisiAc()
    return {
      pdf: await faturaPdf(tarayici, html, k.belge, k.ettn, { imzasizOlabilir: k.onay !== IMZALI }),
      dosyaAdi: `${siparisNo}.pdf`,
    }
  } catch (e) {
    return { hata: mesaj(e) }
  } finally {
    await pdfTarayicisiKapat(tarayici)
    if (oturum) await gibCikis(oturum)
  }
}
