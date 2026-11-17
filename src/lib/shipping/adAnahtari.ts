/**
 * İl/ilçe adını karşılaştırma anahtarına çevirir (Türkçe harfleri sadeleştirir,
 * boşluk ve noktalamayı atar). Sunucu (lib/shipping/geo) ve ödeme sayfasındaki
 * il/ilçe seçici aynı kuralı kullanır; bu yüzden ayrı ve bağımlılıksız modülde.
 */
export function adAnahtari(metin: string): string {
  return (metin || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıîöşüâ]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', î: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a' })[c] || c)
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}
