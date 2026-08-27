import { strict as assert } from 'node:assert'
import { organizationJsonLd, productJsonLd, webPageJsonLd } from '../seo.ts'

import { HAZIRLIK_IS_GUNU, HAZIRLIK_LABEL, TASIMA_IS_GUNU, TASIMA_LABEL, TESLIM_CUMLESI } from '../shipping.ts'

import { BANKA_YANSIMA_IS_GUNU, BANKA_YANSIMA_LABEL, SOZLESME_SURUMU } from '../legal/sozlesme.ts'

const taban = {
  slug: 'test-urun', title: 'Test Ürün', description: 'Açıklama', images: ['https://x/1.jpg'],
  stock: 5, barcode: 'NBB999', category: 'Çelik Bileklik', material: '316L Paslanmaz Çelik',
  rating: null, reviewCount: null,
}
const gun = (d: Date) => d.toISOString().slice(0, 10)
const offers = (o: Record<string, unknown>) => o.offers as Record<string, unknown>
const sonuc: string[] = []
const kontrol = (ad: string, kosul: boolean, deger: unknown) => {
  assert.ok(kosul, `${ad} — görülen: ${JSON.stringify(deger)}`)
  sonuc.push(`${ad} → ${JSON.stringify(deger)}`)
}

// 1) KAMPANYALI: validFrom kampanya başlangıcı, bitiş kampanya bitişi
{
  const bitis = new Date(Date.now() + 5 * 86400000)
  const o = offers(productJsonLd({
    ...taban, price: 174.93, listPrice: 249.9,
    priceValidFrom: '2026-08-21T20:59:00Z', campaignEndsAt: bitis.toISOString(),
  }))
  kontrol('kampanyalı validFrom', o.validFrom === '2026-08-21', o.validFrom)
  kontrol('kampanyalı priceValidUntil = kampanya bitişi', o.priceValidUntil === gun(bitis), o.priceValidUntil)
}

// 2) KAMPANYASIZ: validFrom son senkron, bitiş 1 yıl
{
  const birYil = new Date(); birYil.setFullYear(birYil.getFullYear() + 1)
  const o = offers(productJsonLd({
    ...taban, price: 249.9, listPrice: null,
    priceValidFrom: '2026-08-27T09:11:17Z', campaignEndsAt: null,
  }))
  kontrol('kampanyasız validFrom = son senkron', o.validFrom === '2026-08-27', o.validFrom)
  kontrol('kampanyasız priceValidUntil = 1 yıl', o.priceValidUntil === gun(birYil), o.priceValidUntil)
  kontrol('indirim yokken ListPrice basılmaz', o.priceSpecification === undefined, o.priceSpecification)
}

// 3) STOK 0: OutOfStock
{
  const o = offers(productJsonLd({ ...taban, stock: 0, price: 249.9, priceValidFrom: '2026-08-27T09:11:17Z' }))
  kontrol('stok 0 → OutOfStock', o.availability === 'https://schema.org/OutOfStock', o.availability)
}

// 4) TARİH KAYNAĞI YOK → alan hiç basılmaz (uydurma yok)
{
  const o = offers(productJsonLd({ ...taban, price: 249.9, priceValidFrom: null }))
  kontrol('kaynak yoksa validFrom basılmaz', !('validFrom' in o), Object.keys(o).includes('validFrom'))
}

// 5) Kampanya bitişi 1 yıldan UZAKSA 1 yıl kullanılır (fiyat sonsuza kadar vaat edilmez)
{
  const birYil = new Date(); birYil.setFullYear(birYil.getFullYear() + 1)
  const uzak = new Date(Date.now() + 800 * 86400000)
  const o = offers(productJsonLd({
    ...taban, price: 100, listPrice: 200,
    priceValidFrom: '2026-08-21T00:00:00Z', campaignEndsAt: uzak.toISOString(),
  }))
  kontrol('uzak kampanya bitişi 1 yılla sınırlanır', o.priceValidUntil === gun(birYil), o.priceValidUntil)
}

// 6) Geçersiz tarih girdisi çökertmez, alan basılmaz
{
  const o = offers(productJsonLd({ ...taban, price: 100, priceValidFrom: 'saçma-tarih' }))
  kontrol('geçersiz tarih → alan basılmaz', !('validFrom' in o), Object.keys(o))
}

// 7) Yorum yokken aggregateRating basılmaz
{
  const d = productJsonLd({ ...taban, price: 100, rating: 0, reviewCount: 0 })
  kontrol('yorum yokken aggregateRating basılmaz', !('aggregateRating' in d), Object.keys(d))
}

// ── Faz 11F denetim turu bulguları ──

// 8) sku tek yazımda basılır (kaynak barkod küçük harfliyse bile)
{
  const d = productJsonLd({ ...taban, price: 100, barcode: 'Nbgp001' })
  kontrol('sku büyük harfe normalize edilir', d.sku === 'NBGP001', d.sku)
}

// 9) "iş günü" makineye de bildirilir — DAY tek başına takvim günü sayılır
{
  const o = offers(productJsonLd({ ...taban, price: 100 }))
  const gunler = (o.shippingDetails as any)?.deliveryTime?.businessDays?.dayOfWeek
  kontrol(
    'handlingTime iş günü olarak işaretlenir (Pzt–Cum)',
    Array.isArray(gunler) && gunler.length === 5 && gunler[0].endsWith('/Monday'),
    gunler
  )
}

// 10) transitTime AYRI basılır ve hazırlık süresine eşit değildir
{
  const dt = (offers(productJsonLd({ ...taban, price: 100 })).shippingDetails as any).deliveryTime
  kontrol(
    'transitTime 1–5 iş günü olarak basılır',
    dt.transitTime?.minValue === TASIMA_IS_GUNU.min &&
      dt.transitTime?.maxValue === TASIMA_IS_GUNU.max &&
      dt.transitTime?.unitCode === 'DAY',
    dt.transitTime
  )
  kontrol(
    'handlingTime taşımadan AYRI (1–2 ≠ 1–5)',
    dt.handlingTime?.maxValue === HAZIRLIK_IS_GUNU.max && dt.handlingTime.maxValue !== dt.transitTime.maxValue,
    `${dt.handlingTime?.minValue}–${dt.handlingTime?.maxValue} / ${dt.transitTime?.minValue}–${dt.transitTime?.maxValue}`
  )
  kontrol('businessDays deliveryTime düzeyinde, ikisini de kapsar',
    dt.businessDays?.dayOfWeek?.length === 5, dt.businessDays?.dayOfWeek?.length)
}

// 10b) Sayfa metni ile şema AYNI kaynaktan — kopya sayı kalmadı
{
  kontrol('kargo cümlesi iki süreyi ayrı söyler',
    TESLIM_CUMLESI.includes(HAZIRLIK_LABEL) && TESLIM_CUMLESI.includes(TASIMA_LABEL) &&
    HAZIRLIK_LABEL !== TASIMA_LABEL, TESLIM_CUMLESI)
}

// 10c) Belge sayfası şeması
{
  const w = webPageJsonLd({ tip: 'AboutPage', ad: 'Hakkımızda', aciklama: 'Marka hikâyesi.', path: '/hakkimizda' }) as any
  kontrol('AboutPage kendi adresini bildirir',
    w['@type'] === 'AboutPage' && w.url.endsWith('/hakkimizda') && w['@id'] === w.url, w.url)
  kontrol('açıklama yoksa alan basılmaz',
    !('description' in (webPageJsonLd({ tip: 'WebPage', ad: 'X', path: '/x' }) as any)), 'ok')
  const c = webPageJsonLd({ tip: 'ContactPage', ad: 'İletişim', path: '/iletisim',
    kunye: { unvan: 'Nalan Bolat — NB Steelora', telefon: '0505 198 46 46' } }) as any
  kontrol('ContactPage.mainEntity künyeden türer, @context tekrar etmez',
    c.mainEntity?.['@type'] === 'Organization' && c.mainEntity.telephone === '+905051984646' &&
    !('@context' in c.mainEntity), Object.keys(c.mainEntity ?? {}))
}

// 11) Kampanyasız ama liste fiyatı yüksekse ListPrice yine basılır
//     (özel fiyatlı üründe sayfada üstü çizili fiyat görünüyor)
{
  const o = offers(productJsonLd({
    ...taban, price: 300, listPrice: 450, campaignEndsAt: null,
  }))
  const ps = o.priceSpecification as any
  kontrol(
    'kampanyasız özel fiyatta ListPrice basılır',
    ps?.priceType === 'https://schema.org/ListPrice' && ps?.price === '450.00',
    ps
  )
}

// ── Organization künyesi (Faz 11F denetimi) ──

// 12) Yayınlanan künye alanları basılır, telefon E.164'e çevrilir
{
  const o = organizationJsonLd([], {
    unvan: 'Nalan Bolat — NB Steelora',
    adres: 'Akdeniz Mah. 39823 Sok. No:3 Mezitli / Mersin',
    telefon: '0505 198 46 46',
    vergi: '2391094302',
  }) as any
  kontrol('legalName basılır', o.legalName === 'Nalan Bolat — NB Steelora', o.legalName)
  kontrol('telefon +90 biçimine çevrilir', o.telephone === '+905051984646', o.telephone)
  kontrol('vatID salt rakamsa basılır', o.vatID === '2391094302', o.vatID)
  kontrol('adres yayınlanan metinle basılır',
    o.address?.streetAddress === 'Akdeniz Mah. 39823 Sok. No:3 Mezitli / Mersin' &&
    o.address?.addressCountry === 'TR', o.address)
}

// 13) Künye boşsa HİÇBİR alan uydurulmaz
{
  const o = organizationJsonLd([], {}) as any
  kontrol('boş künyede alan basılmaz',
    !('legalName' in o) && !('address' in o) && !('telephone' in o) && !('vatID' in o),
    Object.keys(o))
}

// 14) Vergi alanı birleşik metinse vatID basılmaz (rakam değil, metin)
{
  const o = organizationJsonLd([], { vergi: 'İstiklal V.D. 2391094302' }) as any
  kontrol('metin karışmış vergi alanı vatID olarak basılmaz', !('vatID' in o), o.vatID)
}

// ── Faz 11F son: banka yansıma süresi tek sabitte ──
{
  kontrol('banka yansıma süresi 3–7 iş günü',
    BANKA_YANSIMA_IS_GUNU.min === 3 && BANKA_YANSIMA_IS_GUNU.max === 7 &&
    BANKA_YANSIMA_LABEL === '3–7 iş günü', BANKA_YANSIMA_LABEL)
  kontrol('etiket uzun tire kullanır (kısa tire kalmadı)',
    !BANKA_YANSIMA_LABEL.includes('-'), BANKA_YANSIMA_LABEL)
}

// Sözleşme sürümü metin değişince ilerlemeli
{
  kontrol('sözleşme sürümü 2026-08-23.2 değil (teslimat maddesi değişti)',
    SOZLESME_SURUMU !== '2026-08-23.2' && SOZLESME_SURUMU >= '2026-08-27', SOZLESME_SURUMU)
}

console.log(`✓ ${sonuc.length}/${sonuc.length} ürün şeması testi geçti`)
sonuc.forEach((s) => console.log('   ' + s))
