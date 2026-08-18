import { after } from 'next/server'
import { headers } from 'next/headers'
import { olayYaz, istektenKimlik, botMu, cihazTipi, type AnalyticsEvent } from './track'
import { oturumKimligi, istekIp } from './session'

/**
 * Sunucu tarafı ölçüm (Faz 12).
 *
 * page_view ve product_view burada yazılır: reklam engelleyiciler etkilemez,
 * istemciye tek bayt JS eklenmez. `after()` sayesinde yazım yanıt gönderildikten
 * SONRA çalışır — sayfa hiç yavaşlamaz.
 */
export async function sunucuOlayi(
  event: Extract<AnalyticsEvent, 'page_view' | 'product_view'>,
  ek?: { path?: string; productId?: string | null; collectionSlug?: string | null }
): Promise<void> {
  try {
    const h = await headers()
    const ua = h.get('user-agent')
    if (botMu(ua)) return

    const sessionId = oturumKimligi(istekIp(h), ua, h.get('accept-language'))
    const { visitorId } = istektenKimlik(h.get('cookie'))
    // Yolu proxy başlığa yazar (src/proxy.ts).
    const path = ek?.path ?? h.get('x-nb-path') ?? null
    const referrer = h.get('referer')
    const device = cihazTipi(ua)

    after(async () => {
      await olayYaz({
        event,
        sessionId,
        visitorId,
        path,
        referrer,
        userAgent: ua,
        device,
        productId: ek?.productId ?? null,
        collectionSlug: ek?.collectionSlug ?? null,
      })
    })
  } catch (e: any) {
    // Ölçüm hiçbir koşulda sayfayı düşürmez.
    // Build sırasında statik prerender denemesi headers() yüzünden bu dalı
    // tetikler; sayfa sonra dinamiğe düşüp canlıda normal ölçülür — bu yüzden
    // o mesaj gürültü sayılır ve loglanmaz.
    if (!/Dynamic server usage|couldn't be rendered statically/i.test(String(e?.message))) {
      console.error('[analytics] sunucu olayı atlandı:', e?.message)
    }
  }
}
