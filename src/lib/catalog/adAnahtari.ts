/**
 * Görünen adın KARŞILAŞTIRMA anahtarı (Faz 11A-FIX · F3, F4).
 *
 * İki kart müşteri için "aynı ad" ise, aradaki fark büyük/küçük harf, fazladan
 * boşluk ya da noktalama olabilir. Karşılaştırma bunların hepsini siler.
 * Türkçe'ye özgü İ/I dönüşümü elle yapılır: `toLowerCase()` "İNCİ"yi "i̇nci"
 * yapıp iki ayrı anahtar üretiyordu.
 *
 * Saf modül — hiçbir import'u yok; panel, API ve tarama aracı aynı kuralı
 * kullansın diye tek yerde duruyor.
 */
export function adAnahtari(ad: string | null | undefined): string {
  return (ad ?? '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}
