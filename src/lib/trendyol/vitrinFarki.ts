/**
 * Senkronun yazacağı satır, veritabanındaki hâlinden farklı mı? (25 Kas 2026)
 *
 * Neden: günlük senkron her koşunun sonunda vitrin önbelleğinin tamamını
 * tazeliyordu (lib/cache/vitrin). Çoğu gün Trendyol'da hiçbir şey değişmiyor;
 * yine de bütün ürün, blog ve koleksiyon sayfaları bir sonraki ziyarette
 * yeniden üretiliyordu — ücretsiz planda ayda 4 saatlik sunucu süresinden
 * boşa giden pay (docs/vercel-ucretsiz-sinir.md, 25 Kasım 2026).
 *
 * Kural EMNİYETLİ taraftan kuruldu — şüphede "değişti" denir:
 *  - Beyaz liste yok. Yükteki HER alan karşılaştırılır; yalnız aşağıdaki iki
 *    defter alanı (her koşuda yenilenen zaman damgaları) dışarıda. Yüke yarın
 *    yeni bir alan eklenirse kendiliğinden karşılaştırmaya girer.
 *  - Mevcut satır yoksa (yeni ürün) → değişti.
 *  - Mevcut satırda alan hiç okunmadıysa (undefined) ve yükte değer varsa →
 *    değişti.
 *  - Türü belirsiz ya da sayıya çevrilemeyen değer → değişti.
 * Yanlış "değişti" yalnız bir önbellek tazelemesine mal olur (eski davranış);
 * yanlış "değişmedi" ise vitrinde gece yarısına kadar eski fiyat demektir —
 * hata payı bu yüzden hep ilk tarafa bırakıldı.
 */

/** Her koşuda yenilenen, vitrinde görünmeyen alanlar. */
export const DEFTER_ALANLARI: readonly string[] = ['last_synced_at', 'updated_at']

/** Karşılaştırılan (ve bunun için veritabanından okunan) alanlar: yükün tamamı, defter alanları hariç. */
export function karsilastirilanAlanlar(yuk: Record<string, unknown>): string[] {
  return Object.keys(yuk).filter((alan) => !DEFTER_ALANLARI.includes(alan))
}

const bos = (d: unknown): d is null | undefined => d === null || d === undefined

function ayni(a: unknown, b: unknown): boolean {
  if (bos(a) || bos(b)) return bos(a) && bos(b)
  // Sayı: veritabanı ondalıklı kolonu sayı ya da metin olarak döndürebilir
  // ("464.03"); yük hep sayıdır. Mantıksal değer sayıya ÇEVRİLMEZ.
  if (typeof a === 'number' || typeof b === 'number') {
    const sayisal = (d: unknown) => typeof d === 'number' || (typeof d === 'string' && d.trim() !== '')
    if (!sayisal(a) || !sayisal(b)) return false
    const x = Number(a)
    const y = Number(b)
    return Number.isFinite(x) && Number.isFinite(y) && x === y
  }
  // Dizi (görseller): sıra da anlamlıdır — ilk görsel kapak görselidir.
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return a === b
}

/**
 * Farklı olan alan adlarını döndürür; boş dizi = bu satır vitrinde hiçbir şeyi
 * değiştirmiyor. Mevcut satır yoksa tek ögeli ['(yeni ürün)'].
 */
export function vitrinFarki(
  mevcut: Record<string, unknown> | null | undefined,
  yazilan: Record<string, unknown>
): string[] {
  if (!mevcut) return ['(yeni ürün)']
  return karsilastirilanAlanlar(yazilan).filter((alan) => !ayni(mevcut[alan], yazilan[alan]))
}
