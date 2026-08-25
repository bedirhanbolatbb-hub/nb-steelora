/**
 * Kampanya ADININ ekranda basılacak hâli (Faz 11A).
 *
 * KUSUR: kampanyanın panel adı vitrine olduğu gibi düşüyordu. Canlıda
 * "TÜM ÜRÜNLERDE SEPETTE %30 İNDİRİM 🚀" yazıyordu — büyük harfle bağırma ve
 * emoji, marka sesi belgesinin ikisi de açıkça yasakladığı şeyler
 * (docs/marka-sesi.md).
 *
 * VERİTABANINDAKİ ADA DOKUNULMAZ. Panelde BB kampanyayı nasıl adlandırdıysa
 * öyle kalır; bu yalnız gösterim katmanı. Böylece panel içi arama ve geçmiş
 * kayıtlar bozulmaz.
 *
 * NOT: vitrin bandının metni buradan GELMEZ — o zaten Faz 21 metin
 * kütüphanesinden (vitrinMetni) üretiliyor ve temiz. Burası kampanya ADININ
 * basıldığı yerler için: ürün sayfası, sepet, ödeme özeti, kart rozeti.
 */

/** Emoji ve süs sembolleri — metinden atılır. */
const SEMBOL = /[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu

/** Küçük kalması gereken bağlaç ve edatlar (başta değilse). */
const KUCUK_KALIR = new Set([
  've', 'ile', 'de', 'da', 'ya', 'ki', 'için', 'göre', 'kadar', 'üzeri', 'üzerinde',
  'her', 'tüm', 'bir',
])

/** Kelime tamamen BÜYÜK mü (Türkçe harfler dahil)? */
function hepsiBuyukMu(k: string): boolean {
  const harfler = k.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '')
  if (harfler.length < 2) return false
  return harfler === harfler.toLocaleUpperCase('tr-TR')
}

function buyukHarfeCevir(k: string): string {
  return k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1)
}

/**
 * Kampanya adını okunur hâle getirir.
 *
 * "TÜM ÜRÜNLERDE SEPETTE %30 İNDİRİM 🚀" → "Tüm ürünlerde sepette %30 indirim"
 * "Hoş Geldin İndirimi"                  → "Hoş Geldin İndirimi"  (dokunulmaz)
 */
export function kampanyaEtiketi(ham: string | null | undefined): string {
  const temiz = String(ham ?? '')
    .replace(SEMBOL, ' ')
    // Ünlem de marka sesinde yasak.
    .replace(/!+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!temiz) return ''

  const kelimeler = temiz.split(' ')
  // Metnin ÇOĞU büyük harfliyse bağırıyor demektir; başlık düzenine çevrilir.
  const buyukSayisi = kelimeler.filter(hepsiBuyukMu).length
  const bagiriyor = buyukSayisi >= Math.max(2, Math.ceil(kelimeler.length / 2))

  if (!bagiriyor) return temiz

  return kelimeler
    .map((k, i) => {
      // Yüzde, sayı ve KOD gibi parçalar olduğu gibi kalır. Harf+rakam
      // karışımı bir kupon kodudur (NB30, HOSGELDIN10) — küçültülemez.
      if (/^[%₺]|^\d/.test(k)) return k
      if (/\d/.test(k) && /[A-Za-zÇĞİÖŞÜ]/.test(k)) return k
      // Tamamı büyük olmayan kelimeye (özel ad olabilir) dokunulmaz.
      if (!hepsiBuyukMu(k)) return k
      const kucuk = k.toLocaleLowerCase('tr-TR')
      if (i > 0 && KUCUK_KALIR.has(kucuk)) return kucuk
      return i === 0 ? buyukHarfeCevir(kucuk) : kucuk
    })
    .join(' ')
}
