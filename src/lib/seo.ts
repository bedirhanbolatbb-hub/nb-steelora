/**
 * Yapısal veri (schema.org / JSON-LD) yardımcıları.
 *
 * Kural: veri yoksa alan HİÇ basılmaz. Boş string, 0 puan, uydurma sosyal
 * hesap ya da var olmayan bir arama adresi yerine alanı düşürüyoruz — eksik
 * bilgi, yanlış bilgiden iyidir ve arama motorları yanlış işaretlemeyi
 * cezalandırır.
 *
 * Tüm çıktı sunucuda üretilir; istemciye tek satır JS eklemez.
 */
import { HAZIRLIK_IS_GUNU, TASIMA_IS_GUNU } from './shipping'

/**
 * Pazartesi–Cuma. schema.org'da hem handlingTime hem transitTime bu pencerede
 * sayılır; bildirilmezse unitCode DAY takvim günü olarak yorumlanır.
 */
const IS_GUNLERI = {
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: [
    'https://schema.org/Monday',
    'https://schema.org/Tuesday',
    'https://schema.org/Wednesday',
    'https://schema.org/Thursday',
    'https://schema.org/Friday',
  ],
} as const

export const SITE_URL = 'https://www.nbsteelora.com'
export const ORG_NAME = 'NB Steelora'
export const ORG_EMAIL = 'info@nbsteelora.com'

/**
 * Marka logosu — KARE (512×512), app/logo/route.tsx üretir.
 *
 * Önceden /opengraph-image (1200×630 paylaşım kartı) kullanılıyordu; kare logo
 * yuvalarında kırpılıp boş zemin ya da kesik yazı veriyordu. Panelden gerçek
 * bir logo yüklenirse organizationJsonLd onu tercih eder.
 */
export const ORG_LOGO = `${SITE_URL}/logo`

/** HTML etiketlerini ve fazla boşluğu atıp düz metne indirger. */
export function plainText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Metni kelime sınırından kırpar (JSON-LD açıklamaları için ~200 karakter). */
export function truncate(text: string, max = 200): string {
  if (text.length <= max) return text
  const kesik = text.slice(0, max)
  const son = kesik.lastIndexOf(' ')
  return `${(son > 40 ? kesik.slice(0, son) : kesik).trim()}…`
}

/** Yalnız künyede YAZAN alanlar basılır; boş anahtar hiç eklenmez. */
export type OrganizationKunyesi = {
  unvan?: string
  adres?: string
  telefon?: string
  vergi?: string
  /** Panelden yüklenen kare logo; boşsa üretilen ORG_LOGO kullanılır. */
  logo?: string
}

export function organizationJsonLd(
  sameAs: (string | null | undefined)[] = [],
  kunye: OrganizationKunyesi = {}
) {
  return { '@context': 'https://schema.org', ...organizationVarligi(sameAs, kunye) }
}

/**
 * Aynı kurum nesnesi ama '@context' YOK — başka bir şemanın içine gömülmek
 * için (ör. ContactPage.mainEntity). İç içe bloklarda @context tekrarı
 * geçersiz değil ama gereksiz; tek bağlam kök blokta bildirilir.
 */
function organizationVarligi(
  sameAs: (string | null | undefined)[] = [],
  kunye: OrganizationKunyesi = {}
) {
  // sameAs yalnız DOLU sosyal adreslerle basılır (site_content'ten gelir);
  // hiç yoksa alan hiç eklenmez.
  const data: Record<string, unknown> = {
    '@type': 'Organization',
    name: ORG_NAME,
    url: SITE_URL,
    logo: (kunye.logo ?? '').trim() || ORG_LOGO,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: ORG_EMAIL,
      areaServed: 'TR',
      availableLanguage: 'Turkish',
    },
  }

  // ── Künye (Faz 11F denetimi) ──
  //
  // Unvan, adres, telefon ve vergi no /iletisim sayfasında "Yasal Satıcı
  // Bilgileri" başlığıyla ZATEN yayında; Google'ın Organization belgelerinde de
  // önerilen alanlar. Uydurma yok: hepsi panelden doldurulan site_content
  // anahtarlarından okunur, boş olan alan HİÇ BASILMAZ.
  const unvan = (kunye.unvan ?? '').trim()
  if (unvan) data.legalName = unvan

  const adres = (kunye.adres ?? '').trim()
  if (adres) {
    // Adres tek satır serbest metin olarak tutuluyor. Mahalle/ilçe/il ayrıştırma
    // kalıbı başka bir adreste sessizce yanlış parçalayabilir; yayınlanan metin
    // olduğu gibi streetAddress'e yazılır, ülke sabit TR.
    data.address = { '@type': 'PostalAddress', streetAddress: adres, addressCountry: 'TR' }
  }

  // "0505 198 46 46" → "+905051984646". Yalnız biçim değişir, numara aynı.
  const rakam = (kunye.telefon ?? '').replace(/\D/g, '')
  const telefon =
    rakam.length === 11 && rakam.startsWith('0')
      ? `+90${rakam.slice(1)}`
      : rakam.length === 10
        ? `+90${rakam}`
        : rakam.length === 12 && rakam.startsWith('90')
          ? `+${rakam}`
          : ''
  if (telefon) {
    data.telephone = telefon
    ;(data.contactPoint as Record<string, unknown>).telephone = telefon
  }

  // vatID yalnız SALT RAKAM bir vergi/MERSİS numarasıysa basılır; "İstiklal
  // V.D. 239…" gibi birleşik metin yazılmaz.
  const vergi = (kunye.vergi ?? '').trim()
  if (/^\d{10,16}$/.test(vergi)) data.vatID = vergi

  const dolu = sameAs.map((s) => (s ?? '').trim()).filter(Boolean)
  if (dolu.length > 0) data.sameAs = dolu
  return data
}

export function websiteJsonLd() {
  // SearchAction BASILMIYOR: sitede metin aramasını karşılayan bir ADRES yok
  // (arama yalnız modal + /api/search). Hedefi olmayan bir SearchAction
  // arama motoruna çalışmayan bir kalıp vaat etmek olurdu.
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: SITE_URL,
    inLanguage: 'tr-TR',
    publisher: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      // '/' için SITE_URL'e eğik çizgi EKLENMEZ: Organization.url, WebSite.url ve
      // ana sayfa canonical'ı çizgisiz; aynı sayfanın iki yazımı şemada birlikte
      // geçmesin (Faz 11F kapanış denetimi).
      item: item.path === '/' ? SITE_URL : `${SITE_URL}${item.path}`,
    })),
  }
}

/**
 * Belge / bilgi sayfaları için sayfa kimliği (Faz 11F kapanış).
 *
 * /hakkimizda, /iletisim, /kargo-ve-iade ve hukuki metinlerin hiçbiri yapısal
 * veri taşımıyordu: arama motoru bu sayfaların ne olduğunu yalnız metinden
 * çıkarmak zorundaydı. AboutPage/ContactPage/WebPage bunu açıkça söyler.
 *
 * Uydurma yok: ad ve açıklama sayfanın kendi başlığı ve kendi metninden gelir,
 * boş açıklama basılmaz.
 */
export type SayfaSemaTipi = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'Blog'

export function webPageJsonLd(s: {
  tip: SayfaSemaTipi
  ad: string
  aciklama?: string | null
  path: string
  /** ContactPage'de künyeden türeyen kurum bilgisi. */
  kunye?: OrganizationKunyesi | null
  sameAs?: (string | null | undefined)[]
}) {
  const url = `${SITE_URL}${s.path}`
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': s.tip,
    '@id': url,
    url,
    name: s.ad,
    inLanguage: 'tr-TR',
    isPartOf: { '@type': 'WebSite', name: ORG_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
  }
  const aciklama = (s.aciklama ?? '').trim()
  if (aciklama) data.description = truncate(aciklama, 300)

  // İletişim sayfasında kurumun kendisi sayfanın konusudur; künye zaten
  // ekranda basılıyor (SaticiKunyesi), şema onu tekrar etmez, işaret eder.
  if (s.kunye) data.mainEntity = organizationVarligi(s.sameAs ?? [], s.kunye)
  return data
}

export type ProductSeoInput = {
  slug: string
  title: string
  description: string
  images: string[]
  /** Müşterinin GERÇEKTEN ödediği fiyat (kampanya uygulanmış hâli). */
  price: number
  /** Kampanya öncesi liste fiyatı — yalnız indirim varsa doldurulur. */
  listPrice?: number | null
  stock: number
  barcode: string | null
  category: string | null
  material: string | null
  rating: number | null
  reviewCount: number | null
  /**
   * Fiyatın bu hâle geldiği GERÇEK an (Faz 11F — Search Console uyarısı).
   * Kampanyasız üründe son senkron (fiyat oradan doğrulanır), yoksa ürünün
   * eklendiği tarih. Kampanyalı üründe kampanyanın başlangıcı.
   */
  priceValidFrom?: string | null
  /**
   * Kampanya bitişi — indirimli fiyat bu tarihten sonra geçerli değildir.
   * Doluysa priceValidUntil bunu AŞMAZ.
   */
  campaignEndsAt?: string | null
}

export function productJsonLd(p: ProductSeoInput) {
  const url = `${SITE_URL}/urun/${p.slug}`

  // ── Fiyatın geçerlilik penceresi (Faz 11F) ──
  //
  // Search Console "validFrom eksik" uyarısı verdi. Uydurma tarih basmak
  // yerine fiyatın GERÇEKTEN o hâle geldiği an kullanılır:
  //   · kampanyalı ürün → kampanyanın başlangıcı
  //   · kampanyasız ürün → son senkron (fiyat Trendyol'dan orada doğrulandı),
  //     o da yoksa ürünün eklendiği tarih
  // Kaynak yoksa alan HİÇ BASILMAZ — boş ya da tahmini tarih yazılmaz.
  const gunu = (d: string | null | undefined): string | null => {
    if (!d) return null
    const t = new Date(d)
    return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10)
  }
  const validFrom = gunu(p.priceValidFrom)

  // Bitiş: varsayılan bir yıl. Kampanyalı üründe kampanyanın bitişini AŞAMAZ —
  // indirimli fiyatı kampanya bittikten sonra da geçerliymiş gibi bildirmek
  // Merchant Center'da fiyat uyuşmazlığı doğurur.
  const birYilSonra = new Date()
  birYilSonra.setFullYear(birYilSonra.getFullYear() + 1)
  const kampanyaBitisi = p.campaignEndsAt ? new Date(p.campaignEndsAt) : null
  const gecerlilik =
    kampanyaBitisi && !Number.isNaN(kampanyaBitisi.getTime()) && kampanyaBitisi < birYilSonra
      ? kampanyaBitisi
      : birYilSonra

  // Vitrin kampanyası açıkken sayfada indirimli fiyat yazıyor. Yapısal veri
  // liste fiyatını basarsa arama motoru ile sayfa çelişir; Merchant Center bunu
  // "fiyat uyuşmazlığı" diye reddeder. Bu yüzden `price` ÖDENEN fiyattır ve
  // liste fiyatı ayrıca `priceSpecification` ile bildirilir (Faz 18).
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url,
    priceCurrency: 'TRY',
    price: Number(p.price).toFixed(2),
    priceValidUntil: gecerlilik.toISOString().slice(0, 10),
    ...(validFrom ? { validFrom } : {}),
    availability:
      p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: ORG_NAME },
    // Kargo vaadi tek kaynaktan: her siparişte ücretsiz.
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0.00', currency: 'TRY' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'TR' },
      // Faz 11F kapanış: iki süre AYRI bildirilir ve ikisi de lib/shipping'in
      // tek kaynağından okunur — sayfa metniyle şema ayrışamaz.
      //   · handlingTime → ödeme onayından kargoya verilene kadar (1–2 iş günü)
      //   · transitTime  → taşıyıcının teslim süresi (1–5 iş günü)
      // "1–5 iş günü"nün toplam değil TAŞIMA süresi olduğu işletme tarafından
      // doğrulandı; toplamdan çıkarımla üretilmiş bir sayı değil.
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: HAZIRLIK_IS_GUNU.min,
          maxValue: HAZIRLIK_IS_GUNU.max,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: TASIMA_IS_GUNU.min,
          maxValue: TASIMA_IS_GUNU.max,
          unitCode: 'DAY',
        },
        // İkisi de İŞ GÜNÜ; unitCode DAY tek başına takvim günü sayılır ve
        // vaat edilenden dar bir süre bildirilmiş olurdu.
        businessDays: IS_GUNLERI,
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'TR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
      // Koşulların tamamının yayınlandığı sayfa.
      merchantReturnLink: `${SITE_URL}/kargo-ve-iade`,
    },
  }

  if (p.listPrice && Number(p.listPrice) > Number(p.price)) {
    offer.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      priceType: 'https://schema.org/ListPrice',
      priceCurrency: 'TRY',
      price: Number(p.listPrice).toFixed(2),
    }
  }

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    url,
    brand: { '@type': 'Brand', name: ORG_NAME },
    offers: offer,
  }

  if (p.description) data.description = truncate(p.description)
  if (p.images.length > 0) data.image = p.images
  // sku bir kimlik alanı: 'Nbgp001' ile 'NBGP001' farklı ürün gibi eşleşir.
  // Kaynak trendyol_barcode'a DOKUNULMAZ, yalnız basılırken tek yazıma getirilir.
  if (p.barcode) data.sku = p.barcode.trim().toUpperCase()
  if (p.category) data.category = p.category
  if (p.material) data.material = p.material

  // Puan yalnız GERÇEK onaylı yorum varsa basılır; yoksa alan hiç eklenmez.
  if (p.rating && p.rating > 0 && p.reviewCount && p.reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.rating).toFixed(1),
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return data
}

export type ArticleSeoInput = {
  slug: string
  title: string
  description: string
  image: string | null
  publishedAt: string | null
  updatedAt: string | null
}

export function articleJsonLd(a: ArticleSeoInput) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${a.slug}` },
    author: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: ORG_LOGO },
    },
  }

  if (a.description) data.description = truncate(a.description, 300)
  if (a.image) data.image = a.image
  if (a.publishedAt) data.datePublished = a.publishedAt
  if (a.updatedAt) data.dateModified = a.updatedAt

  return data
}
