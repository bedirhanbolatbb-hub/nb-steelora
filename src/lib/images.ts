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
