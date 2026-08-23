import { NextResponse } from 'next/server'
import { olayYaz, istektenKimlik, botMu, cihazTipi, ISTEMCI_OLAYLARI, type AnalyticsEvent } from '@/lib/analytics/track'
import { oturumKimligi, istekIp } from '@/lib/analytics/session'
import { uyeKimligi } from '@/lib/analytics/uye'

export const dynamic = 'force-dynamic'

/**
 * İstemci olaylarının tek girişi (Faz 12).
 * Anon rol tabloya doğrudan yazamaz; yazım yalnız buradan, service role ile.
 * Oturum kimliği istemciden ALINMAZ — sunucuda çerezsiz olarak türetilir,
 * böylece istemci kendi kimliğini uyduramaz.
 */

// İstemci olayları tek kaynaktan gelir (bkz. track.ts ISTEMCI_OLAYLARI).
// 'product_view' ayrıca burada: sunucu da yazabiliyor ama ürün sayfasındaki
// istemci ölçümü de kabul edilir.
const IZINLI: readonly AnalyticsEvent[] = [...ISTEMCI_OLAYLARI, 'product_view']

export async function POST(request: Request) {
  const ua = request.headers.get('user-agent')
  // Bot ise sessizce kabul edip yazmıyoruz (istemciye hata dönmenin faydası yok).
  if (botMu(ua)) return NextResponse.json({ ok: true, skipped: 'bot' })

  const body = await request.json().catch(() => null)
  const event = String(body?.event || '') as AnalyticsEvent
  if (!IZINLI.includes(event)) {
    return NextResponse.json({ error: 'Bilinmeyen olay' }, { status: 400 })
  }

  const { visitorId } = istektenKimlik(request.headers.get('cookie'))
  const sessionId = oturumKimligi(
    istekIp(request.headers),
    ua,
    request.headers.get('accept-language')
  )
  // Tuz yoksa kimlik yok: olayı yazmıyoruz (uyarı session modülünde loglandı).
  if (!sessionId) return NextResponse.json({ ok: true, skipped: 'salt' })

  await olayYaz({
    event,
    sessionId,
    visitorId,
    userId: await uyeKimligi(),
    path: typeof body?.path === 'string' ? body.path : null,
    referrer: request.headers.get('referer'),
    userAgent: ua,
    device: cihazTipi(ua),
    productId: typeof body?.productId === 'string' ? body.productId : null,
    collectionSlug: typeof body?.collectionSlug === 'string' ? body.collectionSlug : null,
    searchQuery: typeof body?.searchQuery === 'string' ? body.searchQuery : null,
    value: Number.isFinite(Number(body?.value)) ? Number(body.value) : null,
    meta: body?.meta && typeof body.meta === 'object' ? body.meta : null,
  })

  return NextResponse.json({ ok: true })
}
