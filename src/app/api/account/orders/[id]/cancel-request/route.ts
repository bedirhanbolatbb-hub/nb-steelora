import { NextResponse } from 'next/server'
import { talepTeyidiEmail } from '@/lib/emails/templates'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { adimKaydet } from '@/lib/iade/akis'
import { GERI_GONDERME_GUN } from '@/lib/legal/sozlesme'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  fetchOrderOwnedByUser,
  hasPendingOrderRequest,
  parseOptionalReason,
} from '@/lib/account/orderRequestsApi'
import { sendMail } from '@/lib/emails/send'
import { adminOrderRequestEmail } from '@/lib/emails/templates'
import { bildirimAdresi } from '@/lib/emails/bildirim'

const ALLOWED = new Set(['paid', 'preparing'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  let body: unknown = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const parsed = parseOptionalReason(body)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'Açıklama geçersiz veya çok uzun.' },
      { status: 400 }
    )
  }

  const service = createServiceClient()
  const owned = await fetchOrderOwnedByUser(service, orderId, user.id)
  if (!owned.ok) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
  }

  if (!ALLOWED.has(owned.order.status)) {
    return NextResponse.json(
      { error: 'Bu sipariş için iptal talebi şu anda oluşturulamaz.' },
      { status: 400 }
    )
  }

  if (await hasPendingOrderRequest(service, orderId)) {
    return NextResponse.json(
      { error: 'Bu sipariş için zaten bekleyen bir talep var.' },
      { status: 409 }
    )
  }

  const { data: row, error } = await service
    .from('order_requests')
    .insert({
      order_id: orderId,
      user_id: user.id,
      request_type: 'cancel',
      status: 'pending',
      reason: parsed.reason,
    })
    .select('id, order_id, user_id, request_type, status, reason, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Bu sipariş için zaten bekleyen bir talep var.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Talep kaydedilemedi.' }, { status: 500 })
  }

  // Mağaza sahibine anında bildirim (Faz 15).
  try {
    const { data: order } = await service
      .from('orders')
      .select('order_number, total')
      .eq('id', orderId)
      .maybeSingle()
    if (order) {
      const alici = await bildirimAdresi()
      const bildirim = adminOrderRequestEmail(order, 'cancel', parsed.reason)
      await sendMail({ to: alici, ...bildirim, label: 'Admin cancel request' })
    }
  } catch (bildirimHata) {
    console.error('[cancel-request] yönetici bildirimi gönderilemedi:', bildirimHata)
  }

  // MÜŞTERİYE DERHÂL TEYİT (Faz 20). Mesafeli Sözleşmeler Yönetmeliği m.11/2:
  // internet sitesi üzerinden cayma sunuluyorsa, talebin ulaştığına ilişkin
  // teyit bilgisinin tüketiciye derhâl iletilmesi ZORUNLUDUR. Önceden talep
  // anında müşteriye hiçbir şey gitmiyordu.
  try {
    const { data: siparis } = await service
      .from('orders')
      .select('order_number, guest_email')
      .eq('id', orderId)
      .maybeSingle()
    if (siparis) {
      const teyit = talepTeyidiEmail({
        orderNumber: siparis.order_number,
        tip: 'cancel',
        gonderimGunu: GERI_GONDERME_GUN,
      })
      const gonderim = await musteriMailiGonder({
        eposta: siparis.guest_email,
        orderNumber: siparis.order_number,
        subject: teyit.subject,
        html: teyit.html,
        label: 'Cancel request received',
      })
      await adimKaydet(service, orderId, 'talep', {
        mailId: (gonderim as any)?.id ?? null,
        mailNotu: (gonderim as any)?.sebep ?? null,
      })
    }
  } catch (teyitHatasi) {
    // Teyit gönderilemezse talep yine geçerli; yalnız loglanır.
    console.error('[cancel-request] teyit maili gönderilemedi:', teyitHatasi)
  }

  return NextResponse.json({ request: row }, { status: 201 })
}
