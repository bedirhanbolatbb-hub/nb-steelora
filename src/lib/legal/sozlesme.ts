/**
 * Mesafeli satış onayının tek kaynağı (Faz 19).
 *
 * Mesafeli Sözleşmeler Yönetmeliği m.5 ve m.6: tüketici, sipariş vermeden
 * ÖNCE ön bilgilendirmeyi okuduğunu ve sözleşmeyi kabul ettiğini açıkça
 * beyan etmeli; satıcı bu beyanı ispatlamakla yükümlüdür. Bu yüzden onayın
 * kendisi de, onay anındaki metin SÜRÜMÜ de siparişe damgalanıyor — "müşteri
 * neyi onayladı" sorusunun cevabı yıllar sonra da elimizde olsun.
 *
 * SÜRÜM KURALI: /mesafeli-satis-sozlesmesi ya da /on-bilgilendirme-formu
 * metinlerinde ESASA ilişkin bir değişiklik yapıldığında bu tarih güncellenir.
 * Yazım düzeltmesi için değiştirmeye gerek yok.
 */
export const SOZLESME_SURUMU = '2026-08-23'

/** Cayma hakkı süresi — mevzuat asgarisi 14 gün. */
export const CAYMA_SURESI_GUN = 14

export const SOZLESME_YOLLARI = {
  onBilgilendirme: '/on-bilgilendirme-formu',
  mesafeliSatis: '/mesafeli-satis-sozlesmesi',
} as const

/** Siparişe damgalanan onay kaydı. */
export type SozlesmeOnayi = {
  onaylandi: true
  surum: string
  onaylandiginda: string
  metinler: string[]
}

export function sozlesmeOnayiDamgasi(simdi: Date = new Date()): SozlesmeOnayi {
  return {
    onaylandi: true,
    surum: SOZLESME_SURUMU,
    onaylandiginda: simdi.toISOString(),
    metinler: [SOZLESME_YOLLARI.onBilgilendirme, SOZLESME_YOLLARI.mesafeliSatis],
  }
}
