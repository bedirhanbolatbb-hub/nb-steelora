/** Admin-allowed order status transitions (payment callback sets pending→paid separately). */
const ALLOWED: Record<string, Set<string>> = {
  pending: new Set(['pending', 'paid', 'cancelled']),
  paid: new Set(['paid', 'preparing', 'cancelled']),
  preparing: new Set(['preparing', 'shipped', 'cancelled']),
  shipped: new Set(['shipped', 'delivered']),
  delivered: new Set(['delivered']),
  cancelled: new Set(['cancelled']),
}

const ADMIN_STATUS_OPTION_ORDER = [
  'pending',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const

/** Values allowed in the admin status dropdown for the current row (includes current status). */
export function getAdminSelectableOrderStatuses(current: string | null | undefined): string[] {
  const c = current || 'pending'
  const set = ALLOWED[c]
  if (!set) return [c]
  return ADMIN_STATUS_OPTION_ORDER.filter((s) => set.has(s))
}

export function validateOrderStatusTransition(from: string | null | undefined, to: string): string | null {
  const f = from || 'pending'
  if (f === to) return null
  const allowed = ALLOWED[f]
  if (!allowed || !allowed.has(to)) {
    return `Geçersiz durum geçişi: ${f} → ${to}`
  }
  return null
}
