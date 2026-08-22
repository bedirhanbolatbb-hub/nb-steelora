/**
 * Trendyol stok yazım bayrağı (Faz 16B).
 *
 * Keşifte çıkan tablo: `decreaseStock`/`increaseStock` bizim DB'yi güncelledikten
 * sonra Trendyol'a **mutlak** stok yazıyordu (`newStock`). Bizim değerimiz günde
 * bir kez (12:00 TR) senkronlandığı için gün içinde bayatlıyor; Trendyol'da
 * aradan satış geçtiyse mutlak yazım oradaki gerçek stoğu yukarı çekip olmayan
 * ürünü satışa açabiliyordu. Canlı ölçüm: NBK200 bizde 10 iken Trendyol'da 11.
 *
 * Bu yüzden yazım artık varsayılan olarak KAPALI ve dört kademeli:
 *
 *   off       → Trendyol'a yazılmaz. Yalnız bizim DB güncellenir, tek satır log.
 *   shadow    → Yazılmaz ama "şu barkoda şu değeri yazacaktım" loglanır/kaydedilir.
 *   whitelist → Yalnız TRENDYOL_STOCK_WRITE_BARCODES listesindeki barkodlara yazılır.
 *   on        → Tüm katalog için yazılır.
 *
 * Kademe ortam değişkeniyle değişir; kod değişikliği gerekmez.
 */

export type StokYazimModu = 'off' | 'shadow' | 'whitelist' | 'on'

export function stokYazimModu(): StokYazimModu {
  const ham = (process.env.TRENDYOL_STOCK_WRITE || 'off').trim().toLowerCase()
  if (ham === 'shadow' || ham === 'whitelist' || ham === 'on') return ham
  return 'off'
}

/** whitelist kademesinde yazıma açık barkodlar (virgülle ayrılmış). */
export function beyazListe(): string[] {
  return (process.env.TRENDYOL_STOCK_WRITE_BARCODES || '')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean)
}

/** Bu barkoda gerçekten yazılacak mı? */
export function yazimAcik(barcode: string | null | undefined): boolean {
  const mod = stokYazimModu()
  if (mod === 'on') return true
  if (mod === 'whitelist') return Boolean(barcode) && beyazListe().includes(String(barcode))
  return false
}
