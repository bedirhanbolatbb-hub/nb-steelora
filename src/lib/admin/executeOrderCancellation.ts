import type { SupabaseClient } from '@supabase/supabase-js'
import { refundFullPayment } from '@/lib/iyzico/client'
import { increaseStock } from '@/lib/trendyol/stockUpdate'
import { validateOrderStatusTransition } from '@/lib/orders/statusTransitions'

function lineProductId(item: any): string | null {
  const id = item?.productId ?? item?.product_id
  if (id == null || id === '') return null
  const s = String(id).trim()
  if (!s || s === 'KARGO') return null
  return s
}

export type AdminOrderCancelResult =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string }

/**
 * Full admin cancel path: validation, iyzico refund when applicable, stock restore, status → cancelled.
 * Shared by PATCH /api/admin/orders/[id] and order request approval.
 */
export async function executeAdminOrderCancellation(
  serviceClient: SupabaseClient,
  orderId: string
): Promise<AdminOrderCancelResult> {
  const { data: existing, error: fetchErr } = await serviceClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchErr || !existing) {
    return { ok: false, status: 404, error: fetchErr?.message || 'Sipariş bulunamadı' }
  }

  if (existing.status === 'cancelled') {
    console.log('[admin-order-cancel] idempotent — already cancelled', { orderId })
    return { ok: true }
  }

  const cancelErr = validateOrderStatusTransition(existing.status, 'cancelled')
  if (cancelErr) {
    console.warn('[admin-order-cancel] rejected', { orderId, reason: cancelErr })
    return { ok: false, status: 400, error: cancelErr }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const needsRefund =
    (existing.status === 'paid' || existing.status === 'preparing') &&
    Boolean(existing.iyzico_payment_id)

  // Double-refund guard: payment_refunded_at set → skip iyzico refund.
  if (needsRefund && !existing.payment_refunded_at) {
    console.log('[admin-order-cancel] refund start', {
      orderId,
      paymentId: existing.iyzico_payment_id,
    })
    const refund = await refundFullPayment(String(existing.iyzico_payment_id))
    console.log('[admin-order-cancel] refund result', {
      orderId,
      success: refund.success,
      error: refund.error,
    })
    if (!refund.success) {
      return {
        ok: false,
        status: 502,
        error: refund.error || 'iyzico iade başarısız',
      }
    }

    const { error: refundStampErr } = await serviceClient
      .from('orders')
      .update({ payment_refunded_at: new Date().toISOString() })
      .eq('id', orderId)

    if (refundStampErr) {
      console.error(
        '[admin-order-cancel] CRITICAL: refund API succeeded but payment_refunded_at DB update failed',
        { orderId, refundStampErr }
      )
      return {
        ok: false,
        status: 500,
        error: 'İade kaydı veritabanına yazılamadı',
      }
    }
  }

  // Double stock-restore guard: stock_restored_at set → skip increaseStock loop.
  if (existing.stock_deducted_at && !existing.stock_restored_at) {
    console.log('[admin-order-cancel] stock restore start', { orderId })
    const items = Array.isArray(existing.items) ? (existing.items as any[]) : []
    let restoredLines = 0
    for (const item of items) {
      const pid = lineProductId(item)
      if (!pid) continue
      const qty = Math.max(1, Number(item.quantity) || 1)
      const inc = await increaseStock(pid, qty)
      console.log('[admin-order-cancel] stock restore line', {
        orderId,
        productId: pid,
        quantity: qty,
        success: inc.success,
        error: inc.error,
      })
      if (!inc.success) {
        console.error(
          '[admin-order-cancel] CRITICAL: iyzico refund may have completed but stock restore failed',
          { orderId, productId: pid, error: inc.error }
        )
        return {
          ok: false,
          status: 500,
          error: inc.error || 'Stok iadesi başarısız',
          code: 'STOCK_RESTORE_FAILED',
        }
      }
      restoredLines += 1
    }
    if (restoredLines === 0 && items.length > 0) {
      console.warn('[admin-order-cancel] stock restore: no product lines to restore', { orderId })
    }
    updateData.stock_restored_at = new Date().toISOString()
    console.log('[admin-order-cancel] stock restore complete', { orderId, restoredLines })
  } else {
    console.log('[admin-order-cancel] stock restore skip', {
      orderId,
      stock_deducted_at: existing.stock_deducted_at,
      stock_restored_at: existing.stock_restored_at,
    })
  }

  updateData.status = 'cancelled'

  const { error } = await serviceClient.from('orders').update(updateData).eq('id', orderId)

  if (error) {
    console.error('[admin-order-cancel] final order update failed', { orderId, error })
    return { ok: false, status: 500, error: error.message }
  }

  console.log('[admin-order-cancel] success', { orderId })
  return { ok: true }
}
