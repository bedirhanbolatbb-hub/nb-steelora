/**
 * Arama metni — Türkçeye uygun eşleştirme (Faz 36).
 *
 * ÖLÇÜLEN KUSURLAR (7 Kas 2026, canlı arama ucu; panelde "sonuçsuz" görünen
 * gerçek müşteri aramaları "Bileklik harfli", "Harf char" …):
 *   "harfli kolye" → 0   (katalogda "Kalp Harf Kolye" var — "-li" eki)
 *   "kalpli kolye" → 0   "yıldızlı" → 0   (aynı ek)
 *   "inci"  → zincir ürünleri ("zINCIr" içinde "inci" geçiyor), asıl
 *             "İnci Kalp Kolye" çıkmıyordu: veritabanı "i" ile "İ"yi ayrı
 *             harf sayıyordu
 * Eski arama her kelimeyi başlığın HERHANGİ bir yerinde arıyordu; Türkçe ek
 * alan kelime hiç tutmuyor, kısa kelime başka kelimenin ortasına takılıyordu.
 *
 * Yeni kural, kelime kelime ve kelime BAŞINDAN:
 *   · Aranan kelime başlıktaki bir kelimenin başıysa tutar ("har" → "harf",
 *     yazarken yarım kalan "cha" → "charm").
 *   · Başlıktaki kelime aranan kelimenin başıysa ve aradaki fark Türkçe bir
 *     ek kadarsa (en çok 4 harf) tutar ("harfli" → "harf", "küpeler" → "küpe").
 *   · Büyük/küçük harf ve Türkçe harfler denk sayılır (İ/i/I/ı, ş/s, ç/c,
 *     ğ/g, ö/o, ü/u): telefonda "kupe" yazan da "küpe"yi bulur.
 */

const DUZ_HARF: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
}

/** Türkçe büyük/küçük harf + harf denkliği; aksanlar atılır. */
export function aramaNormalize(metin: string): string {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (h) => DUZ_HARF[h] ?? h)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Metni karşılaştırılabilir kelimelere böler. */
export function kelimelereAyir(metin: string): string[] {
  return aramaNormalize(metin)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** En uzun Türkçe ek payı ("-ler", "-li", "-lik" …). */
const EK_PAYI = 4

/**
 * @param sorgu  aranan kelime (kelimelereAyir'dan geçmiş)
 * @param kelime başlıktaki kelime (kelimelereAyir'dan geçmiş)
 */
export function kelimeEslesir(sorgu: string, kelime: string): boolean {
  if (kelime.startsWith(sorgu)) return true
  return kelime.length >= 3 && sorgu.startsWith(kelime) && sorgu.length - kelime.length <= EK_PAYI
}
