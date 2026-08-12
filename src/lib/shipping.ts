/**
 * Kargo vaadinin tek kaynağı. Sepet hesabı da vitrindeki metinler de buradan okur;
 * eşik değeri hiçbir bileşende elle yazılmaz.
 */
export const FREE_SHIPPING_THRESHOLD = 500

/** Eşiğin altındaki siparişlerde uygulanan kargo ücreti. */
export const SHIPPING_COST = 49.9

/** "500₺ üzeri" — vitrin metinlerinde kullanılan kısa etiket. */
export const FREE_SHIPPING_MIN_LABEL = `${FREE_SHIPPING_THRESHOLD}₺ üzeri`

/** "500₺ üzeri ücretsiz kargo" */
export const FREE_SHIPPING_LABEL = `${FREE_SHIPPING_MIN_LABEL} ücretsiz kargo`

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD
}

export function shippingCostFor(subtotal: number): number {
  return qualifiesForFreeShipping(subtotal) ? 0 : SHIPPING_COST
}
