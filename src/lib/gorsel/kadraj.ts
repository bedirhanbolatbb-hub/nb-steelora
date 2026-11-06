import { gorselBoyutu, isRemoteMedia, trendyolCdnMi } from '@/lib/images'

/**
 * Vitrin kadrajı — ortak sabitler ve adres kurucu (Faz 35).
 *
 * Kart görseli artık Trendyol CDN'inden ham değil, `/api/gorsel/kadraj`
 * ucundan gelir: uç fotoğrafta takıyı bulur (lib/gorsel/odak.ts), kadrajı
 * ürüne göre kurar ve sonucu bir yıl önbelleğe yazılacak şekilde döner.
 * İlk istekten sonra görsel CDN'den gelir; uç bir daha çalışmaz.
 *
 * Bu dosya istemci tarafında da çalışır (next/image yükleyicisi) — sunucuya
 * özel hiçbir şey içe aktarmaz.
 */

/** Algoritma değişirse artırılır: adres değişir, eski önbellek kendiliğinden düşer. */
export const KADRAJ_SURUM = '2'

/** Uç yalnız bu genişlikleri üretir (önbellek isabeti + kötüye kullanım sınırı). */
export const KADRAJ_GENISLIKLERI = [256, 384, 640, 828, 1080] as const

/** Kadraj oranları: kart 4:5, kategori kapağı 3:4, büyük kart 1:1. */
export const KADRAJ_ORANLARI = { '45': 4 / 5, '34': 3 / 4, '11': 1 } as const
export type KadrajOrani = keyof typeof KADRAJ_ORANLARI

export function kadrajGenisligi(w: number): number {
  return KADRAJ_GENISLIKLERI.find((g) => g >= w) ?? KADRAJ_GENISLIKLERI[KADRAJ_GENISLIKLERI.length - 1]
}

/** Trendyol adresinin küçültmesiz özgün hâli (`/mnresize/<en>/<boy>/` atılır). */
export function trendyolOzgun(url: string): string {
  try {
    const u = new URL(url)
    u.pathname = u.pathname.replace(/^\/mnresize\/\d+\/\d+\//, '/')
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return url
  }
}

/** Kadrajlı görselin adresi. Trendyol dışı kaynakta adres olduğu gibi döner. */
export function kadrajAdresi(src: string, genislik: number, oran: KadrajOrani = '45'): string {
  if (!trendyolCdnMi(src)) return src
  const u = encodeURIComponent(trendyolOzgun(src))
  return `/api/gorsel/kadraj?u=${u}&w=${kadrajGenisligi(genislik)}&o=${oran}&v=${KADRAJ_SURUM}`
}

export function kadrajAdresiMi(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('/api/gorsel/kadraj')
}

/** next/image yükleyicileri (yalnız istemci bileşenlerinden verilir). */
export const kadrajYukleyici45 = ({ src, width }: { src: string; width: number }) => kadrajAdresi(src, width, '45')
export const kadrajYukleyici34 = ({ src, width }: { src: string; width: number }) => kadrajAdresi(src, width, '34')
export const kadrajYukleyici11 = ({ src, width }: { src: string; width: number }) => kadrajAdresi(src, width, '11')

export function kadrajYukleyici(oran: KadrajOrani) {
  return oran === '11' ? kadrajYukleyici11 : oran === '34' ? kadrajYukleyici34 : kadrajYukleyici45
}

/**
 * Küçük resim (sepet, arama, ödeme özeti): kadraj açıksa kadrajlı adres,
 * değilse eski davranış. `unoptimized` her iki durumda da doğru döner —
 * kadraj adresi yereldir ama Vercel'in görsel dönüşümüne GİRMEMELİ (kota).
 */
export function kucukResim(src: string, en: number, kadrajAcik: boolean): { src: string; unoptimized: boolean } {
  if (kadrajAcik && trendyolCdnMi(src)) return { src: kadrajAdresi(src, en, '45'), unoptimized: true }
  const kaynak = gorselBoyutu(src, en)
  return { src: kaynak, unoptimized: isRemoteMedia(kaynak) }
}
