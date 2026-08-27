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

// ── Teslim süresi: hazırlık ve taşıma AYRI (Faz 11F kapanış) ──
//
// Karar (BB, 27 Ağustos 2026): "1–5 iş günü" TAŞIYICI süresidir, toplam değil.
// Süreç sıralıdır: ödeme onayı → 1–2 iş günü hazırlık/kargoya verme →
// 1–5 iş günü kargo taşıması. Gerçek siparişte de doğrulandı (24 Ağustos'ta
// kargoya verildi, 27 Ağustos'ta teslim: 3 iş günü taşıma).
//
// Bu iki aralık altı ayrı sayfada elle yazılıydı (bazısı "1-2", bazısı "1–2")
// ve yapısal veri de kendi kopyasını taşıyordu. Kargo vaadinin geri kalanı gibi
// artık buradan okunur; hiçbir bileşende gün sayısı elle yazılmaz.

// ⚠ BU SAYILARI DEĞİŞTİRİRSENİZ: /kargo-ve-iade, /on-bilgilendirme-formu,
// /mesafeli-satis-sozlesmesi ve /hakkimizda metinleri buradan okuyor — yani
// hukuki metin de değişir. Mesafeli satış
// sözleşmesi ile ön bilgilendirme formunun sürüm/yürürlük tarihini
// (lib/legal/surum.ts) gözden geçirin — esasa ilişkin değişikliktir.

/** Ödeme onayından kargoya verilene kadar — İŞ GÜNÜ. */
export const HAZIRLIK_IS_GUNU = { min: 1, max: 2 } as const

/** Kargoya verildikten sonra taşıyıcının teslim süresi — İŞ GÜNÜ. */
export const TASIMA_IS_GUNU = { min: 1, max: 5 } as const

const araligi = (a: { min: number; max: number }) => `${a.min}–${a.max} iş günü`

/** "1–2 iş günü" */
export const HAZIRLIK_LABEL = araligi(HAZIRLIK_IS_GUNU)

/** "1–5 iş günü" */
export const TASIMA_LABEL = araligi(TASIMA_IS_GUNU)

/**
 * Tek cümlelik net vaat — iki süreyi ayrı ayrı ve SIRALI söyler.
 * Yeni bir vaat değil, yayında olan vaadin toplamla karıştırılmayacak hâli.
 */
export const TESLIM_CUMLESI = `Siparişiniz ${HAZIRLIK_LABEL} içinde kargoya verilir, kargo ${TASIMA_LABEL} içinde teslim eder.`
