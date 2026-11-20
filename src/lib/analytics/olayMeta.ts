import type { AnalyticsEvent } from './track'

/**
 * Ölçüm olaylarının `meta` alanı için tek kural yeri.
 *
 * Sepete eklemenin YAPILDIĞI YER (Faz 36): istemci (hooks/useCart) olaya
 * `meta.kaynak` olarak yazar; ölçüm ucu (api/analytics/track) yalnız bu
 * değerleri kayda geçirir; panel analizindeki "Sepete ekleme nereden?"
 * kırılımı (lib/analytics/report) bu değerlerle okunur. Ürün sayfasındaki asıl
 * düğme ile mobil alt çubuk sayfa yolundan ayırt edilemediği için ayrı işaret
 * gerekir.
 */
export const SEPET_KAYNAKLARI = ['pdp', 'yapiskan', 'kart', 'paylasim'] as const

export type SepetKaynagi = (typeof SEPET_KAYNAKLARI)[number]

export function sepetKaynagiMi(deger: unknown): deger is SepetKaynagi {
  return typeof deger === 'string' && (SEPET_KAYNAKLARI as readonly string[]).includes(deger)
}

/**
 * İstemciden gelen `meta`yı kayda uygun hâle getirir (Faz 27): en fazla 10
 * anahtar, kısa değerler; dizi/obje değerler atılır.
 *
 * 'kaynak' anahtarı iki olayda iki ayrı anlam taşır:
 * · page_view: 'istemci' yalnız ayırt etme işareti (14 Kas) — kayda yazılmaz.
 * · add_to_cart: eklemenin yapıldığı yer (Faz 36) — yalnız bilinen değerler yazılır.
 * 20 Kas 2026: 14 Kas'tan beri 'kaynak' her olayda atılıyordu; panelin
 * "Sepete ekleme nereden?" kırılımı o günden beri yalnız "kaynak kaydı yok"
 * gösteriyordu. Testi: __testler__/olayMeta.test.mts.
 */
export function metaTemizle(ham: unknown, event: AnalyticsEvent): Record<string, unknown> | null {
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return null
  const cikti: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(ham as Record<string, unknown>)) {
    if (Object.keys(cikti).length >= 10) break
    if (typeof k !== 'string' || k.length > 40) continue
    if (k === 'kaynak') {
      if (event === 'add_to_cart' && sepetKaynagiMi(v)) cikti[k] = v
      continue
    }
    if (typeof v === 'number' && Number.isFinite(v)) cikti[k] = v
    else if (typeof v === 'boolean') cikti[k] = v
    else if (typeof v === 'string') cikti[k] = v.slice(0, 120)
  }
  return Object.keys(cikti).length ? cikti : null
}
