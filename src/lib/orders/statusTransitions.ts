/** Admin-allowed order status transitions (payment callback sets pending→paid separately). */
const ALLOWED: Record<string, Set<string>> = {
  pending: new Set(['pending', 'paid', 'cancelled']),
  paid: new Set(['paid', 'preparing', 'cancelled']),
  preparing: new Set(['preparing', 'shipped', 'cancelled']),
  shipped: new Set(['shipped', 'delivered']),
  delivered: new Set(['delivered']),
  cancelled: new Set(['cancelled']),
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
