/**
 * Hediye kutusu bölümünün metin kütüphanesi (Faz 11D — Faz 21 deseni).
 *
 * YANILTICI METİN DÜZELTMESİ: eski başlık "Sevdiklerinize özel hediye paketi"
 * ve düğme "HEDİYE SEÇ" idi — hediye ÜRÜN verildiği ya da kutunun ayrıca
 * satın alındığı algısı yaratıyordu. Anlatılmak istenen tek şey şu:
 * HER SİPARİŞ ÜCRETSİZ HEDİYE KUTUSUNDA GELİR. Bütün varyantlar yalnız bunu
 * söyler; kutunun rengi/görünümü hakkında hiçbir varsayım yazılmaz (kutuyu
 * panelden yüklenen fotoğraf gösterir).
 *
 * Panel site-metinlerindeki "Başka öner" bu listeden üretir; alan boşsa
 * vitrin ilk varyantı basar. Marka sesi: ünlem yok, baskı dili yok.
 */

export type HediyeMetni = { baslik: string; metin: string }

const VARYANTLAR: HediyeMetni[] = [
  {
    baslik: 'Her sipariş hediye kutusunda gelir',
    metin:
      'Ayrıca bir şey seçmeniz gerekmez: her sipariş, ücretsiz hediye kutusunda ' +
      'özenle paketlenip gönderilir. Bir not eklemek isterseniz ödeme adımındaki ' +
      'not alanı yeterli.',
  },
  {
    baslik: 'Kutusu bizden',
    metin:
      'Her sipariş ücretsiz hediye kutusunda gönderilir — kendinize de alsanız, ' +
      'birine armağan da etseniz. Ek ücret ya da ayrı bir seçim yok.',
  },
  {
    baslik: 'Paketlemeyi düşünmeyin',
    metin:
      'Siparişiniz hediye kutusunda, özenle paketlenmiş olarak kapınıza gelir. ' +
      'Bu kutu her siparişe dahildir; ücret alınmaz.',
  },
]

/** Vitrinin bastığı varsayılan metin (panel alanı boşken). */
export const HEDIYE_VARSAYILAN: HediyeMetni = VARYANTLAR[0]

/** Panel "Başka öner" için tam liste — Faz 21 önerici deseniyle uyumlu. */
export function hediyeMetinleri(): HediyeMetni[] {
  return VARYANTLAR
}
