import { CATEGORIES } from '@/lib/catalog/categories'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CAYMA_SURESI_GUN,
  GERI_ODEME_GUN,
  BANKA_YANSIMA_LABEL,
} from '@/lib/legal/sozlesme'
import { FREE_SHIPPING_LABEL, TESLIM_CUMLESI } from '@/lib/shipping'

const TABAN = 'https://www.nbsteelora.com'

/** Günde bir tazelenir — ürün sayısı dışında içerik nadiren değişir. */
export const revalidate = 86400

/**
 * /llms.txt — yapay zekâ asistanları için sitenin özeti (Faz 31).
 *
 * Neden: müşteriler artık ürün ve iade sorularını sohbet asistanlarına da
 * soruyor. Asistan siteyi okurken 60 KB'lık HTML'i ayrıştırmak yerine bu tek
 * dosyadan markanın ne sattığını, kargo ve iade koşullarını ve hangi sayfada
 * ne olduğunu doğrudan alır. Yanlış bilgi vermesinin önüne geçer.
 *
 * Kural: burada UYDURMA bilgi olmaz. Sayılar ve süreler tek kaynaktan
 * (lib/legal/sozlesme.ts, lib/shipping.ts) okunur; ürün sayısı canlı
 * veritabanından gelir. Böylece koşullar değişince bu dosya kendiliğinden
 * güncellenir.
 */
export async function GET() {
  let aktifUrun = 0
  try {
    const supabase = createServiceClient()
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    aktifUrun = count ?? 0
  } catch {
    // Sayı alınamazsa satır hiç basılmaz — tahmini rakam yazılmaz.
  }

  const kategoriler = CATEGORIES.map((c) => `- [${c.title}](${TABAN}/kategori/${c.slug})`).join('\n')

  const metin = `# NB Steelora

> 316L paslanmaz çelik ve premium kaplama takı satan Türkiye merkezli çevrimiçi mağaza. Kolye, küpe, bileklik, yüzük, piercing, halhal ve setler.${aktifUrun > 0 ? ` Şu an ${aktifUrun} ürün satışta.` : ''}

Satıcı: Nalan Bolat — NB Steelora · Mezitli / Mersin, Türkiye
İletişim: info@nbsteelora.com · 0505 198 46 46 (Pazartesi–Cuma 09:00–18:00)
Marka adı TÜRKPATENT'te tescillidir (2025 163503).

## Önemli bilgiler

- Kargo: ${FREE_SHIPPING_LABEL}. ${TESLIM_CUMLESI}
- Cayma hakkı: teslim tarihinden itibaren ${CAYMA_SURESI_GUN} gün, gerekçesiz. Üyelik gerekmez — iade talebi kargo takip sayfasından sipariş numarası ve e-posta ile açılır.
- İade kargo ücreti satıcıya aittir; müşteriden alınmaz.
- Geri ödeme: ürün kargoya verildikten sonra en geç ${GERI_ODEME_GUN} gün içinde başlatılır; karta yansıması bankaya bağlı olarak ${BANKA_YANSIMA_LABEL} sürer.
- Cayma hakkı yalnız iki durumda kullanılamaz: kişiye özel hazırlanan ürünler ve hijyen mührü açılmış küpe/piercing.
- Ödeme iyzico altyapısıyla alınır. Kart bilgisi mağazada saklanmaz.
- Her sipariş ücretsiz hediye kutusunda gönderilir.

## Kategoriler

${kategoriler}

## Sayfalar

- [Tüm ürünler](${TABAN}/urunler)
- [Kargo, iade ve değişim](${TABAN}/kargo-ve-iade)
- [Kargo takibi ve iade talebi](${TABAN}/kargo-takip)
- [Sık sorulan sorular](${TABAN}/sss)
- [Hakkımızda](${TABAN}/hakkimizda)
- [İletişim](${TABAN}/iletisim)
- [Blog — takı rehberi](${TABAN}/blog)

## Yasal

- [Mesafeli satış sözleşmesi](${TABAN}/mesafeli-satis-sozlesmesi)
- [Ön bilgilendirme formu](${TABAN}/on-bilgilendirme-formu)
- [Örnek cayma formu](${TABAN}/cayma-formu)
- [Gizlilik politikası](${TABAN}/gizlilik-politikasi)
- [KVKK aydınlatma metni](${TABAN}/kvkk)
- [Çerez politikası](${TABAN}/cerez-politikasi)

## Notlar

- Ürün fiyatları ve stok durumu gün içinde değişebilir; kesin bilgi ürün sayfasındadır.
- Site haritası: ${TABAN}/sitemap.xml
`

  return new Response(metin, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
