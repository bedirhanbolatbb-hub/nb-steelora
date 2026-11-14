/**
 * Trendyol paketi → GİB e-Arşiv fatura taslağı.
 *
 * Çıktı, e-Arşiv Portal'ın EARSIV_PORTAL_FATURA_OLUSTUR komutuna giden `jp`
 * nesnesidir. Alan adları ve sırası portalın kendi formunun gönderdiği
 * istekten birebir alındı (13 Kas 2026, GIB2026000000007 düzenlenirken
 * yakalandı). `faturaUuid` BOŞ gider: yeni faturada ETTN'yi GİB üretir;
 * istemcinin uydurduğu UUID "Ettn ya eksik…" hatasıyla reddediliyor.
 *
 * Fatura biçimi BB'nin elle kestiği örneklerden (Kas 2026):
 *  - Normal satış (GIB…003): tip SATIS, alıcı TCKN 11111111111, kalem adı
 *    Trendyol'daki ürün adı ("… NBB094, Standart"), birim fiyat KDV hariç
 *    (faturalanacak tutar / 1,2), KDV %20, iskonto 0, not
 *    "YALNIZ: <yazıyla>\nSİPARİŞ NO:<no>".
 *  - Mikro ihracat (GIB…001): tip ISTISNA, KDV %0, kalemde GTİP
 *    711719009029, alıcı ülkesi yabancı, not istisna metni + sipariş no +
 *    yazıyla toplam.
 *  - Kurumsal fatura isteyen sipariş: alıcının vergi numarası ve vergi
 *    dairesiyle (10 hane VKN → unvan; 11 hane → ad soyad).
 *
 * Tutar: müşteriye kesilen tutar Trendyol'un "Faturalanacak Tutar"ıdır —
 * satış fiyatından satıcı indirimi VE Trendyol'un karşıladığı indirim düşülür.
 * Trendyol'un karşıladığı kısım Trendyol'a ayrıca faturalanır; bu modül onu
 * kesmez.
 *
 * Saf fonksiyonlar; ağ, veritabanı, ortam değişkeni yok.
 */
import { toplamTutarSatiri, yalnizSatiri } from './yaziyla'

export interface TrendyolSatir {
  quantity?: number
  productName?: string
  amount?: number
  discount?: number
  tyDiscount?: number
  currencyCode?: string
  orderLineItemStatusName?: string
  barcode?: string
}

export interface TrendyolAdres {
  firstName?: string
  lastName?: string
  fullName?: string
  company?: string
  address1?: string
  address2?: string
  district?: string
  city?: string
  countryCode?: string
  taxNumber?: string
  taxOffice?: string
}

export interface TrendyolPaket {
  id?: number
  customerId?: number
  orderNumber: string
  orderDate?: number
  status?: string
  shipmentPackageStatus?: string
  totalPrice?: number
  currencyCode?: string
  commercial?: boolean
  micro?: boolean
  invoiceLink?: string | null
  invoiceAddress?: TrendyolAdres
  lines?: TrendyolSatir[]
}

export type FaturaTuru = 'normal' | 'kurumsal' | 'mikro'

export type TaslakSonucu =
  | { tamam: true; tur: FaturaTuru; toplam: number; urunler: string[]; jp: Record<string, unknown> }
  | { tamam: false; neden: string }

/** Mikro ihracat GTİP'i — BB'nin GIB2026000000001 faturasındaki kod (adi metalden taklit bijuteri). */
export const MIKRO_GTIP = '711719009029'

const KDV_ORANI = 20
const ISIMSIZ_TCKN = '11111111111'

/**
 * GİB ülke listesindeki adlar 20 harfte kesik ve kimi i/ı farklı yazılmış.
 * Intl'in Türkçe adıyla birebir tutmayanlar burada; gerisi Intl'den gelir.
 * Kaynak: e-Arşiv Portal fatura formunun ülke seçenekleri (13 Kas 2026).
 */
const GIB_ULKE: Record<string, string> = {
  TR: 'Türkiye',
  AE: 'Birleşik Arap Emirli',
  BY: 'Beyaz Rusya',
  CY: 'Kibris Rum Kesimi',
  CZ: 'Çek Cumhuriyeti',
  EG: 'Misir',
  GB: 'Birleşik Krallik',
  HR: 'Hirvatistan',
  KG: 'Kirgizistan',
  MD: 'Moldavya',
  MK: 'Makedonya',
  RS: 'Sirbistan',
  RU: 'Rusya Federasyonu',
  US: 'Amerika Birleşik Dev',
}

export function gibUlkeAdi(kod: string): string {
  const k = kod.trim().toUpperCase()
  if (GIB_ULKE[k]) return GIB_ULKE[k]
  try {
    return (new Intl.DisplayNames(['tr'], { type: 'region' }).of(k) ?? k).slice(0, 20)
  } catch {
    return k
  }
}

/** Portaldaki not satırından sipariş numarası: "SİPARİŞ NO:123…", "Sipariş No: 123…" ya da eski "sipariş no: 123…". */
export function siparisNoNottan(not: unknown): string | null {
  const m = String(not ?? '').match(/(?:SİPARİŞ NO|Sipariş No|sipariş no)\s*:?\s*(\d{8,})/)
  return m ? m[1] : null
}

const r2 = (x: number) => Math.round(Math.round(x * 1e6) / 1e4) / 100
const r10 = (x: number) => Math.round(x * 1e10) / 1e10
const yazi = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()
const tl = (x: number) => x.toFixed(2)
const elle = (neden: string): TaslakSonucu => ({ tamam: false, neden })

/**
 * Her satırın müşteriye kesilecek tutarı. Trendyol `amount`/`discount`
 * alanlarının birim mi satır toplamı mı olduğu belgede net değil; üç okumadan
 * hangisi paketin `totalPrice`ına kuruşu kuruşuna denk geliyorsa o kullanılır.
 * Hiçbiri tutmazsa null → sipariş elle kesilir. Tek kalem tek adette üçü aynıdır.
 */
function satirNetleri(satirlar: TrendyolSatir[], toplam: number): number[] | null {
  const ind = (l: TrendyolSatir) => (l.discount ?? 0) + (l.tyDiscount ?? 0)
  const adet = (l: TrendyolSatir) => l.quantity || 1
  const okumalar = [
    (l: TrendyolSatir) => (l.amount ?? 0) - ind(l),
    (l: TrendyolSatir) => (l.amount ?? 0) * adet(l) - ind(l),
    (l: TrendyolSatir) => ((l.amount ?? 0) - ind(l)) * adet(l),
  ]
  for (const oku of okumalar) {
    const netler = satirlar.map((l) => r2(oku(l)))
    const toplamNet = r2(netler.reduce((a, b) => a + b, 0))
    if (netler.every((n) => n > 0) && Math.abs(toplamNet - toplam) < 0.005) return netler
  }
  return null
}

function adSoyad(a: TrendyolAdres): { ad: string; soyad: string } {
  const ad = yazi(a.firstName)
  const soyad = yazi(a.lastName)
  if (ad || soyad) return { ad, soyad }
  const tam = yazi(a.fullName)
  const bosluk = tam.lastIndexOf(' ')
  return bosluk > 0 ? { ad: tam.slice(0, bosluk), soyad: tam.slice(bosluk + 1) } : { ad: tam, soyad: '' }
}

/** "FATİH VERGİ DAİRESİ" → "FATİH" (formdaki alanın adı zaten Vergi Dairesi). */
function vergiDairesiAdi(s?: string): string {
  return yazi(s)
    .replace(/\s*(VERG[İI]\s+DA[İI]RES[İI](\s+MÜDÜRLÜĞÜ|\s+MÜD\.?)?|V\.\s?D\.?)\s*$/i, '')
    .trim()
}

export function taslakHazirla(p: TrendyolPaket, an: { tarih: string; saat: string }): TaslakSonucu {
  const no = String(p.orderNumber)
  const a = p.invoiceAddress ?? {}
  const satirlar = p.lines ?? []
  const toplamFiyat = Number(p.totalPrice)

  if (!satirlar.length) return elle('siparişte ürün satırı yok')
  if ((p.currencyCode && p.currencyCode !== 'TRY') || satirlar.some((l) => l.currencyCode && l.currencyCode !== 'TRY')) {
    return elle('para birimi TL değil')
  }
  if (satirlar.some((l) => /cancel|return|unsuppl/i.test(l.orderLineItemStatusName ?? ''))) {
    return elle('siparişte iptal ya da iade edilmiş satır var')
  }
  if (satirlar.some((l) => !yazi(l.productName))) return elle('ürün adı boş satır var')
  if (!Number.isFinite(toplamFiyat) || toplamFiyat <= 0) return elle('sipariş toplamı okunamadı')

  const netler = satirNetleri(satirlar, toplamFiyat)
  if (!netler) return elle('satır tutarları faturalanacak tutarı tutmuyor')

  const ulkeKodu = yazi(a.countryCode).toUpperCase() || 'TR'
  const mikro = p.micro === true || ulkeKodu !== 'TR'
  const tur: FaturaTuru = mikro ? 'mikro' : p.commercial === true ? 'kurumsal' : 'normal'

  let vknTckn = ISIMSIZ_TCKN
  let aliciUnvan = ''
  let { ad: aliciAdi, soyad: aliciSoyadi } = adSoyad(a)
  let vergiDairesi = ''
  if (tur === 'kurumsal') {
    const vergiNo = (a.taxNumber ?? '').replace(/\D/g, '')
    if (vergiNo.length === 10) {
      aliciUnvan = yazi(a.company) || yazi(a.fullName) || [aliciAdi, aliciSoyadi].filter(Boolean).join(' ')
      aliciAdi = ''
      aliciSoyadi = ''
    } else if (vergiNo.length !== 11) {
      return elle('kurumsal fatura istenmiş ama vergi numarası yok ya da geçersiz')
    }
    vergiDairesi = vergiDairesiAdi(a.taxOffice)
    if (!vergiDairesi) return elle('kurumsal fatura istenmiş ama vergi dairesi yok')
    vknTckn = vergiNo
  }
  if (!aliciUnvan && !aliciAdi) return elle('alıcı adı yok')

  const adres = yazi([a.address1, a.address2].filter(Boolean).join(' '))
  if (!adres) return elle('fatura adresi yok')

  const oran = mikro ? 0 : KDV_ORANI
  let matrah = 0
  let kdv = 0
  const malHizmetTable = satirlar.map((l, i) => {
    const miktar = l.quantity || 1
    const birimFiyat = r10(netler[i] / (1 + oran / 100) / miktar)
    const fiyat = r2(birimFiyat * miktar)
    const kdvTutari = r2((fiyat * oran) / 100)
    matrah = r2(matrah + fiyat)
    kdv = r2(kdv + kdvTutari)
    return {
      malHizmet: yazi(l.productName),
      miktar,
      birim: 'C62',
      birimFiyat: String(birimFiyat),
      fiyat: tl(fiyat),
      iskontoArttm: 'İskonto',
      iskontoOrani: 0,
      iskontoTutari: '0',
      iskontoNedeni: '',
      malHizmetTutari: tl(fiyat),
      kdvOrani: String(oran),
      vergiOrani: 0,
      kdvTutari: tl(kdvTutari),
      vergininKdvTutari: '0',
      ozelMatrahTutari: '0',
      hesaplananotvtevkifatakatkisi: '0',
      ...(mikro ? { gtip: MIKRO_GTIP } : {}),
    }
  })
  const toplam = r2(matrah + kdv)
  // %20 KDV'de kimi tutar kuruşu kuruşuna kurulamaz (391,65 → 391,66): satır
  // başına 1 kuruşa kadar fark kabul, fazlası elle.
  if (Math.abs(toplam - toplamFiyat) > 0.01 * satirlar.length + 1e-9) {
    return elle(`KDV yuvarlamasından sonra toplam ${tl(toplam)}, beklenen ${tl(toplamFiyat)}`)
  }

  const not = mikro
    ? [
        '3065 sayılı KDV Kanunu 11/1-a ve 12. maddeleri gereği mikro ihracat kapsamında KDV istisnalıdır.',
        'İstisna Kodu: 301 – Mal İhracı',
        `Sipariş No: ${no}`,
        toplamTutarSatiri(toplam),
      ].join('\n')
    : `${yalnizSatiri(toplam)}\nSİPARİŞ NO:${no}`

  const jp: Record<string, unknown> = {
    faturaUuid: '',
    belgeNumarasi: '',
    faturaTarihi: an.tarih,
    saat: an.saat,
    paraBirimi: 'TRY',
    dovzTLkur: '0',
    faturaTipi: mikro ? 'ISTISNA' : 'SATIS',
    hangiTip: '5000/30000',
    vknTckn,
    aliciUnvan,
    aliciAdi,
    aliciSoyadi,
    binaAdi: '',
    binaNo: '',
    kapiNo: '',
    kasabaKoy: '',
    vergiDairesi,
    ulke: gibUlkeAdi(ulkeKodu),
    bulvarcaddesokak: adres,
    irsaliyeNumarasi: '',
    irsaliyeTarihi: '',
    mahalleSemtIlce: yazi(a.district),
    sehir: yazi(a.city) || ' ',
    postaKodu: '',
    tel: '',
    fax: '',
    eposta: '',
    websitesi: '',
    iadeTable: [],
    ihracKayitliKarsiBelgeNo: '',
    yatirimTesvikNumarasi: '',
    yatirimTesvikTarihi: an.tarih,
    kdvOranKontrolMuafiyeti: false,
    vergiCesidi: ' ',
    malHizmetTable,
    tip: 'İskonto',
    matrah: tl(matrah),
    malhizmetToplamTutari: tl(matrah),
    toplamIskonto: '0',
    hesaplanankdv: tl(kdv),
    vergilerToplami: tl(kdv),
    vergilerDahilToplamTutar: tl(toplam),
    odenecekTutar: tl(toplam),
    not,
    siparisNumarasi: '',
    siparisTarihi: '',
    fisNo: '',
    fisTarihi: '',
    fisSaati: ' ',
    fisTipi: ' ',
    zRaporNo: '',
    okcSeriNo: '',
  }

  return { tamam: true, tur, toplam, urunler: satirlar.map((l) => yazi(l.productName)), jp }
}
