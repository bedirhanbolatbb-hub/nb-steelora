/**
 * İletişim bilgilerinin tek kaynağı (Faz 11).
 *
 * WhatsApp numarası altı ayrı dosyada elle yazılıydı; numara değişince biri
 * unutulabiliyordu. Numara yalnız burada durur, her yer buradan okur.
 */

/** Uluslararası biçim, yalnız rakam — wa.me bağlantısı bunu ister. */
export const WHATSAPP_NUMBER = '905051984646'

/** Ekranda gösterilecek yerel biçim. */
export const WHATSAPP_DISPLAY = '0505 198 4646'

/** wa.me bağlantısı; metin verilirse hazır mesajla açılır. */
export function whatsappUrl(mesaj?: string): string {
  const taban = `https://wa.me/${WHATSAPP_NUMBER}`
  return mesaj ? `${taban}?text=${encodeURIComponent(mesaj)}` : taban
}

/** Mail şablonları gibi statik metinlerde kullanılan hazır bağlantı. */
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`
