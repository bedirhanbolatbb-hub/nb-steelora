import { goruntuBasliklari, goruntuyuOku, ANAHTAR } from '@/lib/fatura/depo'

/**
 * Trendyol'a bağlantıyla verilen e-Arşiv faturasının sayfası (14 Kas 2026).
 *
 * Bağlantı yalnız o siparişin Trendyol paketine verilir; müşteriye
 * Trendyol'un e-postasıyla gider ve 8 yıl açık kalmalıdır (Trendyol kuralı).
 * Sayfa GİB'in kendi görüntüsüdür, değiştirilmez. Anahtar 128 bit rastgele;
 * önbellek yok, arama motoru yok, sayfa sandbox içinde (lib/fatura/depo.ts).
 * Ayrıntı: docs/fatura-otomatik.md.
 */
export const dynamic = 'force-dynamic'

const bulunamadi = () =>
  new Response('Belge bulunamadı.', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })

export async function GET(_istek: Request, { params }: { params: Promise<{ anahtar: string }> }) {
  const { anahtar } = await params
  if (!ANAHTAR.test(anahtar)) return bulunamadi()
  const html = await goruntuyuOku(anahtar).catch(() => null)
  if (!html) return bulunamadi()
  return new Response(html, { headers: goruntuBasliklari() })
}
