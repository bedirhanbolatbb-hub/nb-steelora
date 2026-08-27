import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import {
  orderCancelledEmail,
  orderConfirmationEmail,
  reviewInviteEmail,
  shippingNotificationEmail,
} from '@/lib/emails/templates'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { bildirimDamgala } from '@/lib/emails/bildirimSuprugu'

export const dynamic = 'force-dynamic'

/**
 * Müşteri mailini elle tekrar gönderir (Faz 30).
 *
 * BB "bildirimler çok çok önemli" diyor. Otomatik akış artık damgalıyor ve
 * süpürüyor, ama bir mail spam'e düşerse ya da müşteri "gelmedi" derse elle
 * tekrar gönderebilmek gerekiyor. Damga güncellenir; süpürge tekrar
 * göndermeye çalışmaz.
 */

const TURLER = ['onay', 'kargo', 'teslimat', 'iptal'] as const
type Tur = (typeof TURLER)[number]

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const orderId = String(body?.orderId ?? '')
  const tur = String(body?.tur ?? '') as Tur

  if (!orderId || !TURLER.includes(tur)) {
    return NextResponse.json({ error: 'orderId ve geçerli bir tür gerekli' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })

  let subject = ''
  let html = ''

  if (tur === 'onay') {
    ;({ subject, html } = orderConfirmationEmail(order as any))
  } else if (tur === 'kargo') {
    const kod = order.tracking_number
    if (!kod) {
      return NextResponse.json(
        { error: 'Takip kodu yok — kargo bildirimi gönderilemez' },
        { status: 400 }
      )
    }
    ;({ subject, html } = shippingNotificationEmail(order as any, String(kod)))
  } else if (tur === 'teslimat') {
    const items = Array.isArray(order.items) ? (order.items as any[]) : []
    const ids = items.map((i) => i?.productId ?? i?.product_id).filter(Boolean)
    const { data: urunler } = ids.length
      ? await supabase
          .from('products_display')
          .select('slug, display_title, display_images')
          .in('id', ids)
      : { data: [] as any[] }
    ;({ subject, html } = reviewInviteEmail(
      order as any,
      (urunler ?? []).map((p: any) => ({
        slug: p.slug,
        display_title: p.display_title,
        image: (p.display_images as string[] | null)?.[0] ?? null,
      }))
    ))
  } else {
    ;({ subject, html } = orderCancelledEmail(order as any, Boolean(order.payment_refunded_at)))
  }

  const gonderim = await musteriMailiGonder({
    eposta: order.guest_email,
    orderNumber: order.order_number,
    subject,
    html,
    label: `Yeniden gönderim (${tur})`,
  })

  if (gonderim.gonderildi) await bildirimDamgala(orderId, tur, (gonderim as any).id ?? null)

  return NextResponse.json({
    ok: gonderim.gonderildi,
    tur,
    id: gonderim.gonderildi ? gonderim.id : null,
    sebep: gonderim.gonderildi ? null : gonderim.sebep,
  })
}
