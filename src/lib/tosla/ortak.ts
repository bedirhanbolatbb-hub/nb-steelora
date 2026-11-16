/**
 * Tosla yardımcılarının TARAYICIDA DA çalışan kısmı (12 Kasım 2026).
 *
 * lib/tosla/client Node'un kripto modülünü kullanır; ödeme ekranı ve panel
 * bileşenleri onu içe aktaramaz. Buradakiler saf sabit ve fonksiyonlardır;
 * client.ts ve kartOdemesi.ts bunları buradan alır — tek kaynak.
 */

/**
 * orders.iyzico_payment_id öneki — Tosla kart ödemesini ayırır. Sütun adı
 * tarihî (iyzico dönemi); içerik `tosla:<sipariş no>` olur, iade yolu buna bakar.
 */
export const TOSLA_ODEME_ONEKI = 'tosla:'

export function toslaOdemesiMi(odemeKimligi: string | null | undefined): boolean {
  return typeof odemeKimligi === 'string' && odemeKimligi.startsWith(TOSLA_ODEME_ONEKI)
}

export function toslaSiparisNo(odemeKimligi: string): string {
  return odemeKimligi.slice(TOSLA_ODEME_ONEKI.length)
}

/** Kartla ödenecek siparişin numarası: NBS-<13 hane ms>. Tosla ≤ 20 karakter. */
export const KART_SIPARIS_DESENI = /^NBS-\d{13}$/

/**
 * Ödeme ekranı müşteriyi YALNIZ Tosla'nın kendi alan adına, şifreli
 * bağlantıyla yönlendirir; sunucudan beklenmedik bir adres gelirse müşteri
 * başka hiçbir sayfaya gönderilmez.
 */
export function toslaOdemeSayfasiMi(adres: unknown): adres is string {
  if (typeof adres !== 'string' || adres.length > 2048) return false
  try {
    const u = new URL(adres)
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      (u.hostname === 'tosla.com' || u.hostname.endsWith('.tosla.com'))
    )
  } catch {
    return false
  }
}
