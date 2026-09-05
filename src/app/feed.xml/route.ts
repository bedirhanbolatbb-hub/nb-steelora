import { HAZIRLIK_IS_GUNU, TASIMA_IS_GUNU } from '@/lib/shipping'
import { createServiceClient } from '@/lib/supabase/service'
import { groupProducts } from '@/lib/catalog/variants'
import { cleanDescription, iddiaTemizle } from '@/lib/catalog/description'
import { materialLabel } from '@/lib/catalog/material'
import { vitrinIndirimiGetir } from '@/lib/campaigns/vitrinIndirimi'
import { plainText, truncate, ORG_NAME, SITE_URL } from '@/lib/seo'

/**
 * Google Merchant Center ürün beslemesi (Faz 18).
 *
 * Faz 18 ölçümünde çıktı: sitede besleme ÜRETEN HİÇBİR KOD YOKTU. Denenen 19
 * aday adres (feed.xml, rss.xml, products.xml, /api/feed …) 404 döndü; çalışan
 * tek XML sitemap'ti. "395 ürünlük besleme" bir dönem elle yüklenmiş olmalı ve
 * artık tazelenmiyor. Bu rota beslemeyi kodun içine alır: tek kaynak katalog,
 * fiyat da vitrinle aynı motordan.
 *
 * NEDEN YALNIZ GRUP KAPAKLARI (432 değil ~283 kalem):
 * Kardeş varyantların başlığı, açıklaması ve fiyatı birebir aynı; ayırt edici
 * özellik (harf, renk, ölçü) `variant_label` olarak yalnız 8 üründe kayıtlı.
 * Hepsini `item_group_id` ile göndermek Merchant'ta "aynı grupta ayırt
 * edilemeyen ürünler" uyarısı üretir; `item_group_id` olmadan göndermek de
 * birbirinin kopyası 149 ilan demek. Kapak göndermek canonical ve sitemap ile
 * de aynı hizada kalır. variant_label doldukça besleme tüm üyelere açılabilir.
 *
 * KİMLİK: takıların üretici GTIN'i yok (432/432 barkod alanı iç SKU).
 * Bu yüzden `identifier_exists = no`; uydurma gtin/mpn göndermiyoruz.
 */

export const revalidate = 3600

const GOOGLE_KATEGORI: Record<string, string> = {
  'Çelik Kolye': 'Apparel & Accessories > Jewelry > Necklaces',
  'Bijuteri Kolye': 'Apparel & Accessories > Jewelry > Necklaces',
  'Çelik Küpe': 'Apparel & Accessories > Jewelry > Earrings',
  'Bijuteri Küpe': 'Apparel & Accessories > Jewelry > Earrings',
  'Çelik Bileklik': 'Apparel & Accessories > Jewelry > Bracelets',
  'Bijuteri Bileklik': 'Apparel & Accessories > Jewelry > Bracelets',
  Bilezik: 'Apparel & Accessories > Jewelry > Bracelets',
  'Çelik Yüzük': 'Apparel & Accessories > Jewelry > Rings',
  'Bijuteri Yüzük': 'Apparel & Accessories > Jewelry > Rings',
  'Bijuteri Halhal': 'Apparel & Accessories > Jewelry > Anklets',
  Piercing: 'Apparel & Accessories > Jewelry > Body Jewelry',
}

const VARSAYILAN_KATEGORI = 'Apparel & Accessories > Jewelry'

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function etiket(ad: string, deger: unknown): string {
  const metin = String(deger ?? '').trim()
  return metin ? `    <${ad}>${esc(metin)}</${ad}>\n` : ''
}

/** Merchant tarih aralığı: 2026-08-21T00:00+03:00/2026-08-31T23:59+03:00 */
function tarihAraligi(baslangic: string | null, bitis: string | null): string | null {
  if (!bitis) return null
  const bas = baslangic ? new Date(baslangic) : new Date()
  const son = new Date(bitis)
  if (Number.isNaN(bas.getTime()) || Number.isNaN(son.getTime())) return null
  return `${bas.toISOString()}/${son.toISOString()}`
}

function urunAciklamasi(p: any): string {
  if (p.override_description) return truncate(iddiaTemizle(plainText(p.override_description)), 4000)
  const temiz = cleanDescription(p.trendyol_description)
  const metin = plainText([...temiz.paragraphs, ...temiz.bullets].join(' '))
  // Açıklaması boş 5 ürün var; başlık + malzeme cümlesi uydurma değil, katalogda
  // zaten yazan bilgi.
  if (metin) return truncate(metin, 4000)
  const malzeme = materialLabel(p.material_type)
  return malzeme ? `${p.display_title} — ${malzeme}.` : String(p.display_title ?? '')
}

export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('products_display')
    .select(
      'id, slug, display_title, display_price, display_images, trendyol_description, override_description, trendyol_category, trendyol_stock, trendyol_barcode, gender, created_at, variant_label, material_type'
    )
    .limit(2000)

  if (error) {
    return new Response('<?xml version="1.0"?><error/>', {
      status: 503,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }

  const kapaklar = groupProducts((data ?? []).filter((p: any) => p.slug) as any[]).map(
    (g) => g.cover as any
  )

  // Vitrin fiyatının tek kaynağı: sayfada ne yazıyorsa beslemede o gider.
  const vitrin = await vitrinIndirimiGetir()
  let indirimAraligi: string | null = null
  if (vitrin?.fiyatGoster && vitrin.oran) {
    const { data: kampanya } = await supabase
      .from('campaigns')
      .select('starts_at, ends_at')
      .eq('id', vitrin.id)
      .maybeSingle()
    indirimAraligi = tarihAraligi(kampanya?.starts_at ?? null, kampanya?.ends_at ?? null)
  }

  const kalemler = kapaklar
    .map((p: any) => {
      const gorseller = (p.display_images as string[] | null) ?? []
      if (gorseller.length === 0) return ''

      const liste = Number(p.display_price) || 0
      if (liste <= 0) return ''
      const indirimli =
        vitrin?.fiyatGoster && vitrin.oran
          ? Math.round(liste * (1 - vitrin.oran / 100) * 100) / 100
          : null

      const stok = Number(p.trendyol_stock) || 0
      const cinsiyet = p.gender === 'men' ? 'male' : p.gender === 'women' ? 'female' : ''

      /**
       * KİMLİK KISA OLMALI (5 Eyl 2026 ölçümü).
       *
       * `g:id` olarak slug gönderiliyordu; Merchant Center'ın sınırı 50 karakter
       * ve slug'ların çoğu 60-70 karakter. Sonuç: 280 kalemin 131'i "Şu özelliğin
       * değeri çok uzun: id" ile REDDEDİLİYORDU — katalogun yarısı Google'a hiç
       * ulaşmadı. Barkod hem kısa hem benzersiz (products.trendyol_barcode üstünde
       * tekil dizin var) hem de kalıcı; barkodu olmayan üründe slug'ın son 50
       * karakteri kullanılır.
       */
      const kimlik = String(p.trendyol_barcode ?? '').trim() || String(p.slug).slice(-50)

      let x = '  <item>\n'
      x += etiket('g:id', kimlik)
      x += etiket('g:title', truncate(String(p.display_title ?? ''), 150))
      x += etiket('g:description', urunAciklamasi(p))
      x += etiket('g:link', `${SITE_URL}/urun/${p.slug}`)
      x += etiket('g:image_link', gorseller[0])
      for (const g of gorseller.slice(1, 11)) x += etiket('g:additional_image_link', g)
      x += etiket('g:availability', stok > 0 ? 'in_stock' : 'out_of_stock')
      x += etiket('g:price', `${liste.toFixed(2)} TRY`)
      if (indirimli && indirimli < liste) {
        x += etiket('g:sale_price', `${indirimli.toFixed(2)} TRY`)
        if (indirimAraligi) x += etiket('g:sale_price_effective_date', indirimAraligi)
      }
      x += etiket('g:condition', 'new')
      x += etiket('g:brand', ORG_NAME)
      // GTIN/MPN yok: takılar kendi üretimimiz, barkod alanı iç SKU.
      x += etiket('g:identifier_exists', 'no')
      x += etiket(
        'g:google_product_category',
        GOOGLE_KATEGORI[String(p.trendyol_category ?? '')] ?? VARSAYILAN_KATEGORI
      )
      x += etiket('g:product_type', p.trendyol_category)
      x += etiket('g:age_group', 'adult')
      x += etiket('g:gender', cinsiyet)
      x += etiket('g:material', materialLabel(p.material_type))
      x += etiket('g:size', p.variant_label)
      // Kargo her siparişte ücretsiz (lib/shipping.ts tek kaynak).
      //
      // Süre alanları Merchant Center ürün veri şartnamesinde g:shipping'in
      // ALT ALANLARI olarak tanımlı ve değerleri İŞ GÜNÜ tamsayısıdır. Sayfa
      // metni ve JSON-LD handlingTime/transitTime ile aynı sabitten okunur;
      // besleme ile vitrin ayrışamaz.
      x += '    <g:shipping>\n'
      x += '      <g:country>TR</g:country>\n'
      x += '      <g:price>0.00 TRY</g:price>\n'
      x += `      <g:min_handling_time>${HAZIRLIK_IS_GUNU.min}</g:min_handling_time>\n`
      x += `      <g:max_handling_time>${HAZIRLIK_IS_GUNU.max}</g:max_handling_time>\n`
      x += `      <g:min_transit_time>${TASIMA_IS_GUNU.min}</g:min_transit_time>\n`
      x += `      <g:max_transit_time>${TASIMA_IS_GUNU.max}</g:max_transit_time>\n`
      x += '    </g:shipping>\n'
      x += '  </item>\n'
      return x
    })
    .filter(Boolean)
    .join('')

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    '<channel>\n' +
    `  <title>${esc(ORG_NAME)}</title>\n` +
    `  <link>${esc(SITE_URL)}</link>\n` +
    '  <description>NB Steelora ürün beslemesi — çelik ve bijuteri takı.</description>\n' +
    kalemler +
    '</channel>\n</rss>\n'

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
