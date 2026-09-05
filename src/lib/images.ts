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

/**
 * Pazaryeri CDN'i mi? (Faz 11A-FIX)
 * Ayrı bir kontrol: `isRemoteMedia` panel medyasını da kapsıyor, oysa aşağıdaki
 * küçültme adresi YALNIZ Trendyol CDN'inde çalışır.
 */
export function trendyolCdnMi(url: string | null | undefined): boolean {
  if (typeof url !== 'string' || !url.startsWith('http')) return false
  try {
    const { hostname } = new URL(url)
    return hostname === 'cdn.dsmcdn.com' || hostname.endsWith('.dsmcdn.com')
  } catch {
    return false
  }
}

/** Kaynak dosyaların gerçek genişliği; üstünü istemek büyütme demek. */
const TY_EN_BUYUK = 1200

/**
 * Görseli KUTUSUNA GÖRE ister (Faz 11A-FIX · F1).
 *
 * ÖLÇÜLEN KUSUR (4 Eyl): kartlar, ürün sayfası ve 56 pikselik küçük resimler
 * dahil HER YÜZEY görselin 1200×1800 orijinalini indiriyordu. Kart kutusu
 * 340 piksel, küçük resim 56 piksel. Tek görselin inmesi ölçümde saniyeler
 * sürüyordu; müşteri o süre boyunca boş fildişi kare görüyordu.
 *
 * Trendyol CDN'i istenen kutuya sığdırılmış hâli ÜCRETSİZ veriyor:
 * `cdn.dsmcdn.com/mnresize/<en>/<boy>/<yol>`. Oran korunur, kırpma yapmaz,
 * büyütmez (ölçüm: 600/600 istendiğinde 1200×1800 kaynak 400×600 döndü).
 *
 * Not: bu adres `next/image` optimizasyonundan bağımsızdır — Vercel'in görsel
 * dönüşüm kotasına DOKUNMAZ (Faz 9B kararı olduğu gibi duruyor).
 *
 * @param genislik İstenen EN — kutu genişliği × ekran yoğunluğu.
 */
export function gorselBoyutu(url: string, genislik: number): string
export function gorselBoyutu(url: string | null | undefined, genislik: number): string | null | undefined
export function gorselBoyutu(url: string | null | undefined, genislik: number) {
  if (!trendyolCdnMi(url)) return url
  try {
    const u = new URL(url as string)
    // Zaten küçültülmüş bir adres geldiyse eski ön ek atılır, yenisi kurulur.
    const yol = u.pathname.replace(/^\/mnresize\/\d+\/\d+\//, '/')
    const en = Math.min(Math.max(Math.round(genislik), 32), TY_EN_BUYUK)
    return `${u.origin}/mnresize/${en}/${en * 2}${yol}${u.search}`
  } catch {
    return url
  }
}

/**
 * next/image için kaynak seçici (Faz 12 · vitrin cilası).
 *
 * ÖLÇÜLEN KUSUR (5 Eyl, Lighthouse mobil): her kart TEK boyutta istiyordu —
 * büyük kart 1100 piksel, mobilde kutusu 182 piksel. Telefona ana sayfada
 * 1,1 MB fazla görsel iniyordu, LCP 7,2 sn.
 *
 * Bu fonksiyon `loader` olarak verildiğinde next/image, `sizes` değerinden
 * her ekran için doğru genişliği kendisi seçer (360…1600 arası basamaklar,
 * next.config.ts) ve her basamağı Trendyol CDN'inden ayrı ister. Vercel'in
 * görsel dönüşüm kotasına yine DOKUNMAZ (Faz 9B kararı korunur).
 *
 * Trendyol dışı kaynaklarda (panel medyası) adres olduğu gibi döner.
 * YALNIZ istemci bileşeninden verilir: sunucu bileşeni next/image'a fonksiyon
 * geçiremez.
 */
export function trendyolYukleyici({ src, width }: { src: string; width: number }): string {
  return gorselBoyutu(src, width)
}

/**
 * Yüklenene kadar basılacak bulanık önizleme (Faz 11A-FIX · F6).
 * Görselin 32 pikselik hâli — birkaç kilobayt. Trendyol dışındaki kaynaklarda
 * yoktur; orada marka tonundaki düz zemin kalır.
 */
export function bulanikOnizleme(url: string | null | undefined): string | null {
  if (!trendyolCdnMi(url)) return null
  return gorselBoyutu(url as string, 32)
}

/**
 * Panel medyasının duyarlı varyantları (Faz 12). Üretim sunucuda, kayıt
 * anında: `lib/gorselVaryant.ts → varyantUret`. Burası yalnız seçim — istemci
 * bileşeninde next/image `loader`'ı olarak kullanılır.
 */
export type GorselVaryanti = { w: number; url: string }

export function varyantSec(varyantlar: GorselVaryanti[] | null | undefined, genislik: number): string | null {
  if (!varyantlar || !varyantlar.length) return null
  const uygun = varyantlar.find((v) => v.w >= genislik)
  return (uygun ?? varyantlar[varyantlar.length - 1]).url
}
