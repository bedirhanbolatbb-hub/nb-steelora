import { BLUR_PLACEHOLDER } from './images'

/**
 * Uzak görselden gerçek blur placeholder üretir (Faz 8C).
 *
 * Yavaş bağlantıda ilk boyama düz gri gradyan yerine görselin bulanık hâli
 * olsun diye: görsel sunucuda indirilir, sharp ile 24px'e küçültülüp webp
 * base64'e çevrilir. Sonuç süreç içi önbelleğe alınır — hero başına tek
 * üretim, ılık lambda'da sıfır ek maliyet. Her hata sessizce marka tonundaki
 * sabit placeholder'a düşer; sayfa asla bloklanmaz (3 sn zaman aşımı).
 */
const cache = new Map<string, string>()
const MAX_CACHE = 200

export async function getBlurDataURL(url: string | null | undefined): Promise<string> {
  if (!url) return BLUR_PLACEHOLDER
  const cached = cache.get(url)
  if (cached) return cached

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return BLUR_PLACEHOLDER
    const buf = Buffer.from(await res.arrayBuffer())

    const sharp = (await import('sharp')).default
    const kucuk = await sharp(buf)
      .resize(24, 24, { fit: 'inside' })
      .webp({ quality: 40 })
      .toBuffer()

    const dataUrl = `data:image/webp;base64,${kucuk.toString('base64')}`
    if (cache.size >= MAX_CACHE) cache.clear()
    cache.set(url, dataUrl)
    return dataUrl
  } catch {
    return BLUR_PLACEHOLDER
  }
}
