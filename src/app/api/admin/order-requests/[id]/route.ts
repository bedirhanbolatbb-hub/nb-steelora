import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { executeAdminOrderCancellation } from '@/lib/admin/executeOrderCancellation'
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

  // Return approval does NOT trigger refund yet — no payment, stock, or order status change; only the order_requests row is updated next.
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

  return NextResponse.json({ success: true })
}
