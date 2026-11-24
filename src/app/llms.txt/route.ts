import { CATEGORIES } from '@/lib/catalog/categories'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CAYMA_SURESI_GUN,
  GERI_ODEME_GUN,
  BANKA_YANSIMA_LABEL,
} from '@/lib/legal/sozlesme'
import { FREE_SHIPPING_LABEL, TESLIM_CUMLESI } from '@/lib/shipping'
import { kartOdemesiAcikMi } from '@/lib/tosla/client'
import { aciklamaBol } from '@/lib/collections'

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
 *
 * 24 Kas 2026: koleksiyonlar ve kapsamlı rehber yazıları da listelenir.
 * Asistanlar "316L çelik takı", "charm bileklik" gibi sorularda kaynak
 * gösterecek sayfayı bu dosyadan buluyor; önceden yalnız kategoriler vardı.
 * İkisi de veritabanından gelir (ad, adres, tek cümle) — elle liste tutulmaz.
 */

/** Rehber sayılacak en kısa yazı: kısa duyuru yazıları listeye girmez. */
const REHBER_EN_AZ_KARAKTER = 3500

export async function GET() {
  let aktifUrun = 0
  let koleksiyonlar: { slug: string; name: string; description: string | null }[] = []
  let rehberler: { slug: string; title: string; excerpt: string | null }[] = []
  try {
    const supabase = createServiceClient()
    const [urun, kol, yazi] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('collections')
        .select('slug, name, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('blog_posts')
        .select('slug, title, excerpt, content')
        .eq('published', true)
        .order('published_at', { ascending: false }),
    ])
    aktifUrun = urun.count ?? 0
    koleksiyonlar = (kol.data ?? []) as typeof koleksiyonlar
    rehberler = ((yazi.data ?? []) as { slug: string; title: string; excerpt: string | null; content: string | null }[])
      .filter((y) => (y.content ?? '').length >= REHBER_EN_AZ_KARAKTER)
      .map((y) => ({ slug: y.slug, title: y.title, excerpt: y.excerpt }))
  } catch {
    // Veri alınamazsa ilgili satırlar hiç basılmaz — tahmini bilgi yazılmaz.
  }

  const tekSatir = (metin: string | null) => (metin ?? '').replace(/\s+/g, ' ').trim()
  const koleksiyonListesi = koleksiyonlar
    .map((k) => {
      const giris = tekSatir(aciklamaBol(k.description).giris)
      return `- [${k.name}](${TABAN}/koleksiyon/${k.slug})${giris ? `: ${giris}` : ''}`
    })
    .join('\n')
  const rehberListesi = rehberler
    .map((y) => {
      const ozet = tekSatir(y.excerpt)
      return `- [${y.title}](${TABAN}/blog/${y.slug})${ozet ? `: ${ozet}` : ''}`
    })
    .join('\n')

  const kategoriler = CATEGORIES.map((c) => `- [${c.title}](${TABAN}/kategori/${c.slug})`).join('\n')

  const metin = `# NB Steelora

> 316L paslanmaz çelik ve kaplama pirinç takı satan Türkiye merkezli çevrimiçi mağaza. Kolye, küpe, bileklik, yüzük, piercing, halhal ve setler.${aktifUrun > 0 ? ` Şu an ${aktifUrun} ürün satışta.` : ''}

Satıcı: İsa Bolat — NB Steelora · Mezitli / Mersin, Türkiye
İletişim: info@nbsteelora.com · 0505 198 46 46 (Pazartesi–Cuma 09:00–18:00)
Marka adı TÜRKPATENT'te tescillidir (2025 163503).

## Önemli bilgiler

- Kargo: ${FREE_SHIPPING_LABEL}. ${TESLIM_CUMLESI}
- Cayma hakkı: teslim tarihinden itibaren ${CAYMA_SURESI_GUN} gün, gerekçesiz. Üyelik gerekmez — iade talebi kargo takip sayfasından sipariş numarası ve e-posta ile açılır.
- İade kargo ücreti satıcıya aittir; müşteriden alınmaz.
- Geri ödeme: ürün kargoya verildikten sonra en geç ${GERI_ODEME_GUN} gün içinde başlatılır; karta yansıması bankaya bağlı olarak ${BANKA_YANSIMA_LABEL} sürer.
- Cayma hakkı yalnız iki durumda kullanılamaz: kişiye özel hazırlanan ürünler ve hijyen mührü açılmış küpe/piercing.
- ${
    kartOdemesiAcikMi()
      ? 'Ödeme kartla (Tosla güvenli ödeme sayfası, 3D Secure, tek çekim; kart bilgisi siteye girilmez) ya da havale/EFT ile, sitedeki satıcı adına kayıtlı hesaba alınır.'
      : 'Ödeme havale/EFT ile, sitedeki satıcı adına kayıtlı hesaba alınır. Kart bilgisi istenmez.'
  }
- Her sipariş ücretsiz hediye kutusunda gönderilir.
- Malzeme: her ürünün malzemesi kendi sayfasında yazar — 316L paslanmaz çelik ya da kaplama pirinç. Kaplama pirinç ürünler bijuteridir; altın ya da gümüş değildir. 316L çelik nikel içerir.

## Kategoriler

${kategoriler}${koleksiyonListesi ? `\n\n## Koleksiyonlar\n\n${koleksiyonListesi}` : ''}${rehberListesi ? `\n\n## Rehberler\n\n${rehberListesi}` : ''}

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
