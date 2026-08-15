/**
 * Görsel yükleme sabitleri.
 * Kaynak görseller pazaryeri CDN'inden ~1200px genişlikte geliyor; bunun
 * üstünü istemek upscale olur ve ilk boyamayı geciktirir (next.config.ts'te
 * deviceSizes üst sınırı 1600).
 */
export const IMAGE_QUALITY = 72

/**
 * Yüklenene kadar marka tonunda düz zemin (dominant renk yaklaşımı).
 * Hiçbir görsel alanı boş krem panel olarak kalmaz.
 * (Tarayıcıda da kullanıldığı için base64 önceden hesaplanmış sabittir.)
 */
export const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNFRkVBRTIiLz48L3N2Zz4='

/**
 * Uzak görsel kaynakları next/image optimizasyonundan muaf tutulur (Faz 9B).
 *
 * Neden: Vercel'in görsel dönüşüm kotası dolduğunda önbelleğe alınmamış HER
 * dönüşüm 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) döner ve müşteri boş
 * kutu görür. İki kaynağın da ikinci bir dönüşüme ihtiyacı yok:
 *   - Trendyol CDN görselleri zaten uygun boyutta (~1200px) geliyor,
 *   - panelden yüklenen medya istemcide ≤2400px webp'ye küçültülüyor.
 * Muaf tutulunca görseller doğrudan kaynağından servis edilir; kota tükense
 * bile vitrin ve panel görselleri çalışmaya devam eder.
 *
 * Yerel görseller (/public altı) bu listede yoktur — optimizasyonları sürer.
 */
export function isRemoteMedia(url: string | null | undefined): boolean {
  if (typeof url !== 'string' || !url.startsWith('http')) return false
  try {
    const { hostname, pathname } = new URL(url)
    if (hostname === 'cdn.dsmcdn.com' || hostname.endsWith('.dsmcdn.com')) return true
    if (hostname.endsWith('.trendyol.com') || hostname.endsWith('.ty-cdn.com')) return true
    return pathname.startsWith('/storage/v1/object/public/')
  } catch {
    return false
  }
}
