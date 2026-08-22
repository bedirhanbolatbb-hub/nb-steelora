import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { executeAdminOrderCancellation } from '@/lib/admin/executeOrderCancellation'
import { executeAdminOrderRefund } from '@/lib/admin/executeOrderRefund'
import { sendMail } from '@/lib/emails/send'
import { orderCancelledEmail } from '@/lib/emails/templates'
import { isLikelyUuid } from '@/lib/admin/isUuid'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id: requestId } = await params
  if (!isLikelyUuid(requestId)) {
    console.warn('[admin-order-requests] invalid request id param', { requestId })
    return NextResponse.json({ success: false, error: 'Talep bulunamadı.' }, { status: 404 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Geçersiz gövde.' }, { status: 400 })
  }

  const action = body.action
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ success: false, error: 'Geçersiz işlem.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: row, error: fetchErr } = await service
    .from('order_requests')
    .select('id, order_id, user_id, request_type, status')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchErr || !row) {
    console.warn('[admin-order-requests] request not found', { requestId, fetchErr })
    return NextResponse.json({ success: false, error: 'Talep bulunamadı.' }, { status: 404 })
  }

  if (!isLikelyUuid(row.order_id)) {
    console.warn('[admin-order-requests] invalid order_id on request row', {
      requestId,
      order_id: row.order_id,
    })
    return NextResponse.json(
      { success: false, error: 'Talep geçersiz sipariş bağlantısı içeriyor.' },
      { status: 400 }
    )
  }

  if (row.status !== 'pending') {
    console.warn('[admin-order-requests] invalid state: not pending', {
      requestId,
      status: row.status,
    })
    return NextResponse.json(
      { success: false, error: 'Bu talep zaten işlendi.' },
      { status: 400 }
    )
  }

  if (action === 'reject') {
    const { data: updated, error: upErr } = await service
      .from('order_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')

    if (upErr) {
      console.error('[admin-order-requests] reject update failed', upErr)
      return NextResponse.json(
        { success: false, error: 'Red kaydı yazılamadı.' },
        { status: 500 }
      )
    }
    if (!updated?.length) {
      console.warn('[admin-order-requests] reject: no row updated (race or stale)', { requestId })
      return NextResponse.json(
        { success: false, error: 'Talep güncellenemedi veya zaten işlendi.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  }

  // approve
  if (row.request_type !== 'cancel' && row.request_type !== 'return') {
    console.warn('[admin-order-requests] unknown request_type', {
      requestId,
      request_type: row.request_type,
    })
    return NextResponse.json({ success: false, error: 'Geçersiz talep türü.' }, { status: 400 })
  }

  if (row.request_type === 'cancel') {
    const cancelResult = await executeAdminOrderCancellation(service, row.order_id)
    if (!cancelResult.ok) {
      console.error('[admin-order-requests] cancel approve: executeAdminOrderCancellation failed', {
        requestId,
        orderId: row.order_id,
        error: cancelResult.error,
        status: cancelResult.status,
      })
      return NextResponse.json(
        {
          success: false,
          error: cancelResult.error,
          ...(cancelResult.code ? { code: cancelResult.code } : {}),
        },
        { status: cancelResult.status }
      )
    }
    // ONLY after successful cancellation: mark request approved (below).
  }

  // İADE onayı artık gerçekten para iade ediyor (Faz 15). Önceden yalnız talep
  // satırı "approved" işaretleniyor, iyzico'ya hiç istek gitmiyordu.
  let iadeSonucu: { iadeEdildi: boolean; tutar: number } | null = null
  if (row.request_type === 'return') {
    const refundResult = await executeAdminOrderRefund(service, row.order_id)
    if (!refundResult.ok) {
      console.error('[admin-order-requests] return approve: iade başarısız', {
        requestId,
        orderId: row.order_id,
        error: refundResult.error,
      })
      return NextResponse.json(
        {
          success: false,
          error: refundResult.error,
          ...(refundResult.code ? { code: refundResult.code } : {}),
        },
        { status: refundResult.status }
      )
    }
    iadeSonucu = { iadeEdildi: refundResult.iadeEdildi, tutar: refundResult.tutar }
  }

  const { data: approvedRows, error: upErr } = await service
    .from('order_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')

  if (upErr) {
    console.error('[admin-order-requests] approve stamp failed', {
      requestId,
      orderId: row.order_id,
      upErr,
    })
    return NextResponse.json(
      {
        success: false,
        error:
          row.request_type === 'cancel'
            ? 'Sipariş iptal edildi ancak talep durumu güncellenemedi. Talebi manuel kontrol edin.'
            : 'Onay kaydı yazılamadı.',
      },
      { status: 500 }
    )
  }

  if (!approvedRows?.length) {
    console.warn('[admin-order-requests] approve: no row updated (race or stale)', { requestId })
    return NextResponse.json(
      { success: false, error: 'Talep güncellenemedi veya zaten işlendi.' },
      { status: 400 }
    )
  }

  // Müşteriye bilgilendirme: iptal/iade akışında hiç mail gitmiyordu, müşteri
  // parasının iade edildiğini yalnız ekranda görüyordu (Faz 15).
  try {
    const { data: order } = await service
      .from('orders')
      .select('order_number, guest_email, total, payment_refunded_at')
      .eq('id', row.order_id)
      .maybeSingle()
    if (order?.guest_email) {
      const { subject, html } = orderCancelledEmail(
        order as any,
        Boolean(order.payment_refunded_at || iadeSonucu?.iadeEdildi)
      )
      await sendMail({
        to: order.guest_email,
        subject,
        html,
        label: row.request_type === 'return' ? 'Return approved' : 'Cancel approved',
      })
    }
  } catch (mailErr) {
    // Mail gönderilemezse işlem geçerli kalır; yalnız loglanır.
    console.error('[admin-order-requests] bilgilendirme maili gönderilemedi', mailErr)
  }

  return NextResponse.json({ success: true, iade: iadeSonucu })
}
