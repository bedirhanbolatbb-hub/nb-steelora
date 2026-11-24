import { markaKategorisi } from './categories'

/**
 * Sepet ve ödeme satırında SEÇİLİ SEÇENEK (24 Kas 2026 tasarım denetimi).
 *
 * Bedenli üründe her beden ayrı bir üründür ve sepet satırında yalnız ürün adı
 * yazıyordu: müşteri sepete hangi yüzük ölçüsünü attığını ödeme adımına kadar
 * hiçbir yerde göremiyordu. Yüzükte "Ölçü 8", diğerlerinde etiketin kendisi
 * (ör. harf kolyede "A"). Etiket yoksa hiçbir şey basılmaz.
 */
export function secenekMetni(urun: {
  trendyol_category?: string | null
  variant_label?: string | null
}): string | null {
  const etiket = String(urun.variant_label ?? '').trim()
  if (!etiket) return null
  return markaKategorisi(urun.trendyol_category) === 'Yüzük' ? `Ölçü ${etiket}` : etiket
}
