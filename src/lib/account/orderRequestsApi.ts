import type { SupabaseClient } from '@supabase/supabase-js'

export const ORDER_REQUEST_REASON_MAX_LEN = 4000

export type OwnedOrderRow = { id: string; status: string }

/** Load order by id; returns ok only if row exists and belongs to userId. */
export async function fetchOrderOwnedByUser(
  service: SupabaseClient,
  orderId: string,
  userId: string
): Promise<{ ok: true; order: OwnedOrderRow } | { ok: false }> {
  const { data, error } = await service
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data || data.user_id !== userId) return { ok: false }
  return { ok: true, order: { id: data.id, status: data.status } }
}

export async function hasPendingOrderRequest(
  service: SupabaseClient,
  orderId: string
): Promise<boolean> {
  const { data } = await service
    .from('order_requests')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .maybeSingle()
  return data != null
}

export function parseOptionalReason(body: unknown):
  | { ok: true; reason: string | null }
  | { ok: false } {
  if (body == null || typeof body !== 'object') {
    return { ok: true, reason: null }
  }
  const raw = (body as { reason?: unknown }).reason
  if (raw === undefined || raw === null) {
    return { ok: true, reason: null }
  }
  if (typeof raw !== 'string') {
    return { ok: false }
  }
  const trimmed = raw.trim()
  if (trimmed.length > ORDER_REQUEST_REASON_MAX_LEN) {
    return { ok: false }
  }
  return { ok: true, reason: trimmed.length ? trimmed : null }
}
