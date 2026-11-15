import { revalidatePath } from 'next/cache'

/**
 * Vitrin önbelleğini tazeler (14 Kas 2026).
 *
 * Ana sayfa (en fazla 1 saat), ürün ve blog sayfaları (en fazla 24 saat)
 * önbellekten veriliyor. Vitrini değiştiren her olayda bu çağrılır: tüm
 * sayfalar bir sonraki ziyarette yeniden üretilir, böylece değişiklik
 * saklama süresini beklemeden görünür. Çağıranlar (15 Kas 2026):
 *   - panel kayıtları (api/panel/*) — YALNIZ yetki kontrolünden SONRA;
 *     yetkisiz bir istek önbelleği boşaltıp sunucu süresi harcatamaz,
 *   - Trendyol senkronu (api/sync) — yalnız gerçekten koşan senkronun sonunda,
 *   - stok değişimi (lib/trendyol/stockUpdate: sipariş, iptal, iade),
 *   - gece yarısı tazelemesi (api/cron/vitrin-tazele): kampanyalar saatle
 *     başlayıp bittiği için sayfadaki indirim ve yapısal veri günü aşmaz.
 *
 * Panel ve senkron `after(vitriniYenile)` ile çağırır: yanıt gönderildikten,
 * yani yazma bittikten SONRA çalışır. Hata işi düşürmez; en kötü ihtimalle
 * sayfa kendi süresi dolunca tazelenir.
 */
export function vitriniYenile(): void {
  try {
    revalidatePath('/', 'layout')
  } catch (e) {
    console.warn('[vitrin] önbellek tazelenemedi:', (e as Error)?.message)
  }
}
