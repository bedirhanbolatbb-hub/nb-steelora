/**
 * Tarayıcıdaki sepeti sunucudaki güncel fiyatla eşitler (21 Kas 2026).
 *
 * KÖK NEDEN (müşteri "ödeme yapamıyorum" dedi): sepet, ürün eklendiği andaki
 * fiyatla tarayıcıda (localStorage) saklanıyor. Fiyat sonradan değişince
 * (Trendyol eşitlemesi, fiyat güncellemesi) ödeme başlatma ucu kalemi haklı
 * olarak "fiyat değişti" diye reddediyordu (409 FIYAT_DEGISTI), ama sepetteki
 * fiyat hiçbir yerde yenilenmiyordu: müşteri her denemede aynı uyarıyı alıyor,
 * ürünü silip yeniden eklemeden ödeme yapamıyordu. Satıştan kalkan bir ürün de
 * aynı şekilde sepette kalıp ödemeyi kilitliyordu ("artık satışta değil").
 *
 * Artık sepet özeti (sepet çekmecesi, sepet sayfası, ödeme adımı) her geldiğinde
 * kalemlerin fiyatı sunucudakiyle eşitlenir, satışta olmayan kalem sepetten
 * çıkar. Tahsil edilen tutar yine YALNIZ sunucuda hesaplanır; istemcinin
 * fiyatı tahsilatta hiç kullanılmaz, yalnız karşılaştırma için gider.
 *
 * Saf fonksiyon: test edilebilir, tarayıcı ve sunucu bağımlılığı yok.
 */

export type SunucuFiyati = { productId: string; fiyat: number }

export type EsitlemeSonucu<T> = {
  items: T[]
  /** Fiyatı sunucudakiyle eşitlenen kalem sayısı. */
  fiyatiDegisen: number
  /** Satışta olmadığı için sepetten çıkarılan kalem sayısı. */
  cikarilan: number
  degisti: boolean
}

/** Sunucudaki karşılaştırmayla AYNI eşik (lib/campaigns/sepetDogrula). */
const ESIK = 0.009

export function sepetiEsitle<
  T extends { product: { id: string; display_price: number }; quantity: number },
>(
  items: T[],
  fiyatlar: SunucuFiyati[] | null | undefined,
  gecersizler: string[] | null | undefined
): EsitlemeSonucu<T> {
  const fiyatHaritasi = new Map<string, number>()
  for (const f of fiyatlar ?? []) {
    const id = typeof f?.productId === 'string' ? f.productId : ''
    const fiyat = Number(f?.fiyat)
    if (id && Number.isFinite(fiyat) && fiyat > 0) fiyatHaritasi.set(id, fiyat)
  }
  const cikacak = new Set((gecersizler ?? []).filter((x): x is string => typeof x === 'string' && x !== ''))

  let fiyatiDegisen = 0
  let cikarilan = 0
  const yeni: T[] = []
  for (const item of items ?? []) {
    const id = item?.product?.id
    if (!id) continue
    if (cikacak.has(id)) {
      cikarilan++
      continue
    }
    const sunucu = fiyatHaritasi.get(id)
    if (sunucu !== undefined && !(Math.abs(Number(item.product.display_price) - sunucu) <= ESIK)) {
      fiyatiDegisen++
      yeni.push({ ...item, product: { ...item.product, display_price: sunucu } })
    } else {
      yeni.push(item)
    }
  }
  return { items: yeni, fiyatiDegisen, cikarilan, degisti: fiyatiDegisen > 0 || cikarilan > 0 }
}

/** Müşteriye gösterilen tek satır — siz dili, ünlem yok. */
export function esitlemeNotu(s: { fiyatiDegisen: number; cikarilan: number }): string | null {
  const parcalar: string[] = []
  if (s.cikarilan > 0) {
    parcalar.push(
      s.cikarilan === 1
        ? 'Sepetinizdeki bir ürün artık satışta olmadığı için sepetten çıkarıldı.'
        : `Sepetinizdeki ${s.cikarilan} ürün artık satışta olmadığı için sepetten çıkarıldı.`
    )
  }
  if (s.fiyatiDegisen > 0) {
    parcalar.push(
      s.fiyatiDegisen === 1
        ? 'Sepetinizdeki bir ürünün fiyatı güncellendi; tutar güncel fiyatla gösteriliyor.'
        : `Sepetinizdeki ${s.fiyatiDegisen} ürünün fiyatı güncellendi; tutar güncel fiyatla gösteriliyor.`
    )
  }
  return parcalar.length ? parcalar.join(' ') : null
}
