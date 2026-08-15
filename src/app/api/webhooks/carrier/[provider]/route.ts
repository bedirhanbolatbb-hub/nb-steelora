import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getProviderBySlug } from '@/lib/shipping/providers'
import {
  gonderiGuncelle,
  gonderiSaglayiciIdIleGetir,
  olayEkle,
  siparisTakipNoSenkronla,
} from '@/lib/shipping/shipments'
import { reviewInviteEmail } from '@/lib/emails/templates'
import { sendMail } from '@/lib/emails/send'

export const dynamic = 'force-dynamic'

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

  if (cozum.durum === 'teslim_edildi') {
    await teslimEdildiAkisi(gonderi.order_id)
  }

  return NextResponse.json({ ok: true, status: cozum.durum })
}

/**
 * Teslim edildiğinde mevcut akış: sipariş durumu 'delivered' olur ve
 * değerlendirme daveti gider. Mail şablonu ve idempotans damgası
 * /api/admin/orders/[id] ile birebir aynı — yeni mail mantığı yazılmaz.
 */
async function teslimEdildiAkisi(orderId: string): Promise<void> {
  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, guest_email, items, review_invite_sent_at')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return

  // Durum matrisi korunur: yalnız shipped → delivered geçişi yapılır.
  if (order.status === 'shipped') {
    await supabase
      .from('orders')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', orderId)
  }

  if (!order.guest_email || order.review_invite_sent_at) return

  const items = Array.isArray(order.items) ? (order.items as any[]) : []
  const productIds = items.map((i) => i?.productId).filter(Boolean)
  let productRows: any[] = []
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products_display')
      .select('slug, display_title, display_images')
      .in('id', productIds)
    productRows = data || []
  }

  const { subject, html } = reviewInviteEmail(
    order as any,
    productRows.map((p) => ({
      slug: p.slug,
      display_title: p.display_title,
      image: (p.display_images as string[] | null)?.[0] ?? null,
    }))
  )
  const sent = await sendMail({ to: order.guest_email, subject, html, label: 'Review invite' })
  if (sent.id) {
    await supabase
      .from('orders')
      .update({ review_invite_sent_at: new Date().toISOString() })
      .eq('id', orderId)
  }
}
