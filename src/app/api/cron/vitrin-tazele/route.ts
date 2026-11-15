import { NextResponse } from 'next/server'
import { cronIstegiMi } from '@/lib/admin/requireAdmin'
import { vitriniYenile } from '@/lib/cache/vitrin'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

/**
 * Gece yarısı vitrin tazelemesi (15 Kas 2026).
 *
 * Ürün ve blog sayfaları 24 saate kadar önbellekte duruyor (ücretsiz plandaki
 * sunucu süresi). Kampanyalar ise saatle başlayıp bitiyor (çoğu gece yarısı);
 * sayfadaki indirimli fiyat, açıklamadaki fiyat ve ürünün yapısal verisi bir
 * önceki günün kampanyasıyla kalmasın diye her gece 00.05'te (TR) önbellek
 * tazelenir. İş yalnız işaret koymaktır: sayfalar bir sonraki ziyarette
 * yeniden üretilir, burada sayfa üretilmez.
 *
 * Yalnız Vercel cron'u (CRON_SECRET) çağırabilir; yetkisiz istek önbelleği
 * boşaltıp sunucu süresi harcatamaz.
 */
export async function GET(request: Request) {
  if (!cronIstegiMi(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  vitriniYenile()
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
