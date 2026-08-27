import { strict as assert } from 'node:assert'
import { productJsonLd } from '../seo.ts'

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

console.log(`✓ ${sonuc.length}/${sonuc.length} ürün şeması testi geçti`)
sonuc.forEach((s) => console.log('   ' + s))
