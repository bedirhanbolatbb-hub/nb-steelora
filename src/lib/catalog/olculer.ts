/**
 * Ürünün ÖLÇÜSÜ (Faz 11A).
 *
 * ÖLÇÜLDÜ (25 Ağu, Trendyol API, 513 content):
 *  · Uzunluk / genişlik / ağırlık diye bir öznitelik YOK.
 *  · `dimensionalWeight` 513 üründe de 0.
 *  · Ölçü yalnız "Beden" özniteliğinde ve yalnız 14 üründe geçiyor
 *    ("45 cm", "55 cm", "6,5 cm"); kalanı "Standart" / "Ayarlanabilir".
 *  · Sync bu özniteliği DB'ye yazmıyor — yalnız kardeşleri ayırdığında
 *    `variant_label` olarak saklıyor.
 *
 * Dolayısıyla ölçü, ürünün ZATEN YAYINDA OLAN metninden okunur: başlık,
 * yoksa açıklama. Aktif 430 üründen 68'inin başlığında, 73'ünün açıklamasında
 * açık bir "NN cm" ifadesi var. Uydurma yok: birim açıkça yazılmayan hiçbir
 * sayı ölçü sayılmaz, bulunamazsa satır BASILMAZ.
 */

/** "45 cm", "6,5 cm", "60cm", "12 mm" — birim ZORUNLU. */
const OLCU = /(?<![\d.,])(\d{1,3}(?:[.,]\d)?)\s?(cm|mm)(?![\wçğıöşü])/i

/** Takıda gerçekçi aralık: bunun dışındaki sayı ölçü değil, gürültüdür. */
function makulMu(deger: number, birim: string): boolean {
  if (birim === 'mm') return deger >= 1 && deger <= 300
  return deger >= 1 && deger <= 120
}

function ayikla(metin: string | null | undefined): string | null {
  if (!metin) return null
  // Açıklama HTML olabilir; etiketler ölçüyle karışmasın.
  const duz = String(metin).replace(/<[^>]+>/g, ' ')
  const m = duz.match(OLCU)
  if (!m) return null
  const sayi = Number(m[1].replace(',', '.'))
  const birim = m[2].toLowerCase()
  if (!Number.isFinite(sayi) || !makulMu(sayi, birim)) return null
  // Türkçe yazımda ondalık virgülle: 6.5 → 6,5
  return `${String(m[1]).replace('.', ',')} ${birim}`
}

/**
 * Ürünün ölçüsünü döndürür; ölçü yoksa null (satır basılmaz).
 *
 * Sıra önemli: varyant etiketi > başlık > açıklama. Etiket bir bedense
 * ("Standart") birim taşımaz, zaten elenir.
 */
export function urunOlcusu(urun: {
  variant_label?: string | null
  override_title?: string | null
  trendyol_title?: string | null
  display_title?: string | null
  override_description?: string | null
  trendyol_description?: string | null
}): string | null {
  return (
    ayikla(urun.variant_label) ??
    ayikla(urun.override_title ?? urun.display_title) ??
    ayikla(urun.trendyol_title) ??
    ayikla(urun.override_description) ??
    ayikla(urun.trendyol_description)
  )
}
