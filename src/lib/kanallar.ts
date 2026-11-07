/**
 * Markanın resmî satış kanalları — istemci ve sunucu kodunun ortak kaynağı.
 *
 * Ödeme sayfası (kartla ödemek isteyeni Trendyol'a yönlendirir) ve ana
 * sayfanın Organization.sameAs alanı bu tek sabitten okur; adres değişirse
 * tek yerde güncellenir. İstemci bileşeni de içe aktardığı için bu dosyaya
 * sunucuya özel hiçbir şey eklenmez.
 */
export const TRENDYOL_MAGAZA_URL = 'https://www.trendyol.com/magaza/nb-steelora-m-1181208'
