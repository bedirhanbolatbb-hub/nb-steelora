/**
 * Kargo vaadinin tek kaynağı.
 *
 * KARAR (Ağustos 2026): kargo ücreti KOŞULSUZ ücretsizdir. 500₺ eşiği ve
 * 49,90₺ kargo bedeli kaldırıldı.
 *
 * Gerekçe: kendi sitemizde pazaryeri komisyonu ödemiyoruz; gönderi başına
 * ~92₺ olan kargo maliyeti bu tasarrufun içinden karşılanıyor. Kargonomi
 * tarafındaki gerçek maliyet bizde kalır, müşteriye yansımaz.
 *
 * Sepet, ödeme, sipariş toplamları ve vitrindeki her metin buradan okur;
 * hiçbir bileşende eşik ya da ücret elle yazılmaz.
 */

/** Kargo her siparişte ücretsiz. */
export const SHIPPING_COST = 0

/** Eşik kalktı; koşul kontrolü yapan eski çağrılar için 0 kalır. */
export const FREE_SHIPPING_THRESHOLD = 0

/** Kısa etiket — "Tüm siparişlerde" */
export const FREE_SHIPPING_MIN_LABEL = 'Tüm siparişlerde'

/** Tam etiket — "Tüm siparişlerde ücretsiz kargo" */
export const FREE_SHIPPING_LABEL = 'Tüm siparişlerde ücretsiz kargo'

/** Sipariş özetinde kargo satırında basılan değer. */
export const SHIPPING_LINE_LABEL = 'Ücretsiz'

/** Artık her sepet ücretsiz kargoya uygun. */
export function qualifiesForFreeShipping(_subtotal?: number): boolean {
  return true
}

/** Her sepette 0. */
export function shippingCostFor(_subtotal?: number): number {
  return SHIPPING_COST
}
