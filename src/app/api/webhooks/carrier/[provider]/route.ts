import { NextResponse } from 'next/server'
import { siparisiKargodanIlerlet } from '@/lib/orders/otomatikDurum'
import { kritikUyari } from '@/lib/izleme/uyari'
import { createServiceClient } from '@/lib/supabase/service'
import { getProviderBySlug } from '@/lib/shipping/providers'
import {
  gonderiGuncelle,
  gonderiSaglayiciIdIleGetir,
  olayEkle,
  siparisTakipNoSenkronla,
} from '@/lib/shipping/shipments'

export const dynamic = 'force-dynamic'

/**
 * Erişilebilirlik yoklaması (Faz 10B).
 *
 * Kargonomi, webhook kaydı sırasında adresi GET ile yokluyor ve 2xx bekliyor;
 * yalnız POST export edildiğinde 405 alıp kaydı reddediyordu. Bu uç hiçbir veri
 * döndürmez, yalnız adresin canlı olduğunu bildirir.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const saglayici = getProviderBySlug(provider)
  if (!saglayici) return NextResponse.json({ error: 'Bilinmeyen sağlayıcı' }, { status: 404 })
  return NextResponse.json({ ok: true, provider: saglayici.slug, hazir: saglayici.hazir })
}

export async function HEAD(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  return new Response(null, { status: getProviderBySlug(provider) ? 200 : 404 })
}

/**
 * Taşıyıcı webhook'u (sağlayıcıdan bağımsız yol: /api/webhooks/carrier/[provider]).
 *
 * - İmza sağlayıcının kendi şemasıyla doğrulanır; imzasız/yanlış imza 401.
 * - idempotency_key ile aynı olay iki kez işlenmez (sağlayıcı 5 kez tekrar
 *   deneyebilir); tekrar gelen olayda da 2xx döneriz ki kuyruk tıkanmasın.
 * - Teslim edildi durumunda MEVCUT değerlendirme daveti akışı çağrılır; yeni
 *   mail yazılmaz ve review_invite_sent_at damgası idempotansı korur.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const saglayici = getProviderBySlug(provider)
  if (!saglayici) {
    return NextResponse.json({ error: 'Bilinmeyen sağlayıcı' }, { status: 404 })
  }

  const hamGovde = await request.text()
  const cozum = saglayici.parseWebhook(hamGovde, request.headers)
  if (!cozum.ok) {
    return NextResponse.json({ error: cozum.hata }, { status: cozum.status })
  }

  const gonderi = await gonderiSaglayiciIdIleGetir(saglayici.slug, cozum.saglayiciGonderiId)
  if (!gonderi) {
    // Bize ait olmayan gönderi: tekrar denemesin diye 200 döneriz.
    return NextResponse.json({ ok: true, ignored: 'Gönderi bulunamadı' })
  }

  const yazildi = await olayEkle({
    shipmentId: gonderi.id,
    status: cozum.durum,
    statusRaw: cozum.durumHam,
    note: cozum.not,
    source: 'webhook',
    occurredAt: cozum.olayZamani,
    idempotencyKey: cozum.idempotencyKey,
  })

  if (!yazildi) {
    // Aynı idempotency_key ile ikinci gelişi: durum zaten işlendi.
    return NextResponse.json({ ok: true, duplicate: true })
  }

  await gonderiGuncelle(gonderi.id, {
    status: cozum.durum,
    status_raw: cozum.durumHam,
    ...(cozum.takipKodu ? { tracking_code: cozum.takipKodu } : {}),
    ...(cozum.durum === 'iptal' ? { cancelled_at: new Date().toISOString() } : {}),
  })

  if (cozum.takipKodu && cozum.takipKodu !== gonderi.tracking_code) {
    await siparisTakipNoSenkronla(gonderi.order_id, cozum.takipKodu)
  }

  // Faz 30: sipariş durumu ve müşteri maili TEK motordan ilerliyor.
  // Eskiden yalnız 'teslim_edildi' işleniyordu; kargo yola çıktığında sipariş
  // 'preparing' kalıyor ve müşteriye kargo bildirimi HİÇ gitmiyordu.
  const ilerleme = await siparisiKargodanIlerlet(gonderi.order_id, cozum.durum, cozum.takipKodu)

  return NextResponse.json({ ok: true, status: cozum.durum, ilerleme })
}

