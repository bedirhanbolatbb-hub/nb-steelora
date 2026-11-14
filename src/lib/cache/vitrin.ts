import { revalidatePath } from 'next/cache'

/**
 * Vitrin önbelleğini tazeler (14 Kas 2026).
 *
 * Ana sayfa, ürün ve blog sayfaları önbellekten veriliyor (en fazla 1 saat).
 * Panelden vitrini etkileyen bir kayıt yapıldığında ya da Trendyol senkronu
 * fiyat/stok yazdığında bu çağrılır: tüm sayfalar bir sonraki ziyarette
 * yeniden üretilir, böylece değişiklik bir saati beklemeden görünür.
 *
 * Çağıranlar `after(vitriniYenile)` ile kullanır: yanıt gönderildikten, yani
 * yazma bittikten SONRA çalışır. Hata işi düşürmez; en kötü ihtimalle sayfa
 * kendi süresi dolunca tazelenir.
 */
export function vitriniYenile(): void {
  try {
    revalidatePath('/', 'layout')
  } catch (e) {
    console.warn('[vitrin] önbellek tazelenemedi:', (e as Error)?.message)
  }
}
