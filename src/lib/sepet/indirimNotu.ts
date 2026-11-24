/**
 * Sepet ve ödeme özetinde indirim satırlarının altındaki tek satırlık not.
 *
 * 24 Kas 2026 tasarım denetimi: özette tek indirim satırı varken altına
 * "Toplam indiriminiz: ₺124,98" yazmak aynı rakamı art arda iki kez
 * gösteriyordu. Toplam yalnız birden çok indirim toplandığında bilgi taşır;
 * tek satırda yalnız (varsa) açıklama yazılır: tavan, kuponun düşmemesi.
 *
 * Üç özet (sepet çekmecesi, sepet sayfası, ödeme) aynı kuralı buradan alır.
 */
export type IndirimNotuGirdisi = {
  /** Uygulanan indirim sayısı: kampanyalar + (düşülüyorsa) havale indirimi. */
  satirSayisi: number
  /** Bu indirimlerin toplamı (TL). */
  toplam: number
  /** Birleşim tavanı devreye girdiyse. */
  tavanUygulandi?: boolean
  /** Kupon girildi ama daha avantajlı kampanya uygulandığı için düşmediyse. */
  kuponDusmedi?: boolean
}

export function indirimNotu(
  g: IndirimNotuGirdisi,
  bicimle: (tutar: number) => string
): string | null {
  if (!(g.toplam > 0)) return null
  const parcalar: string[] = []
  if (g.satirSayisi > 1) parcalar.push(`Toplam indiriminiz: ${bicimle(g.toplam)}`)
  if (g.tavanUygulandi) parcalar.push('İndirim tavanı uygulandı')
  if (g.kuponDusmedi) parcalar.push('En avantajlı kampanya uygulandı; indirimler toplanmaz')
  if (parcalar.length === 0) return null
  return parcalar
    .map((p, i) => (i === 0 ? p : p.charAt(0).toLocaleLowerCase('tr-TR') + p.slice(1)))
    .join(' · ')
}
