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
export const SITE_URL = 'https://www.nbsteelora.com'
export const ORG_NAME = 'NB Steelora'
export const ORG_EMAIL = 'info@nbsteelora.com'

/** Marka görseli: statik logo dosyası yok, Next'in ürettiği OG görseli kullanılır. */
export const ORG_LOGO = `${SITE_URL}/opengraph-image`

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

export function organizationJsonLd(sameAs: (string | null | undefined)[] = []) {
  // sameAs yalnız DOLU sosyal adreslerle basılır (site_content'ten gelir);
  // hiç yoksa alan hiç eklenmez.
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: SITE_URL,
    logo: ORG_LOGO,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: ORG_EMAIL,
      areaServed: 'TR',
      availableLanguage: 'Turkish',
    },
  }
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
      item: `${SITE_URL}${item.path}`,
    })),
  }
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
}

export function productJsonLd(p: ProductSeoInput) {
  const url = `${SITE_URL}/urun/${p.slug}`

  // Fiyat geçerlilik tarihi: bugünden bir yıl sonrası.
  const gecerlilik = new Date()
  gecerlilik.setFullYear(gecerlilik.getFullYear() + 1)

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
    availability:
      p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: ORG_NAME },
    // Kargo vaadi tek kaynaktan: her siparişte ücretsiz.
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0.00', currency: 'TRY' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'TR' },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'TR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
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
  if (p.barcode) data.sku = p.barcode
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
