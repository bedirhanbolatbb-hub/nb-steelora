/**
 * Instagram paylaşımları → sitedeki ürünler.
 *
 * Profildeki bağlantıdan gelen ziyaretçi, gönderide gördüğü parçayı ana
 * sayfada arıyordu; çoğu bulamadan çıkıyor (Kasım 2026 ölçümü: sosyal medyadan
 * gelen 22 ziyaretçiden sepete ekleyen yok). Bu liste o ziyaretçiye paylaşım
 * sırasıyla aynı ürünleri gösterir (bkz. /instagram ve proxy.ts).
 *
 * Neden kod içinde: görseli hazırlayan, paylaşan ve bu listeyi güncelleyen
 * aynı iş akışı. Ürün barkodla (sitedeki model kodu, ör. NBB128) bağlanır;
 * pasife düşen ürün products_display'den zaten gelmez.
 *
 * `yayin` saati gelmeden paylaşım listede görünmez: planlanmış gönderi
 * Instagram'a çıkmadan sitede "paylaştık" denmesin.
 */
export type InstagramPaylasimi = {
  /** Yayın anı, Türkiye saatiyle ISO (ör. 2026-11-07T20:30:00+03:00). */
  yayin: string
  baslik: string
  /** products.trendyol_barcode — sitedeki model kodu. Sıra gönderideki sıradır. */
  barkodlar: string[]
}

export const INSTAGRAM_PAYLASIMLARI: InstagramPaylasimi[] = []

/** Yayın saati gelmiş paylaşımlar, en yenisi başta. */
export function yayindakiPaylasimlar(simdi: number = Date.now()): InstagramPaylasimi[] {
  return INSTAGRAM_PAYLASIMLARI.filter((p) => {
    const t = Date.parse(p.yayin)
    return Number.isFinite(t) && t <= simdi
  }).sort((a, b) => Date.parse(b.yayin) - Date.parse(a.yayin))
}
