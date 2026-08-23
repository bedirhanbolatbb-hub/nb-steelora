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
export const SOZLESME_SURUMU = '2026-08-23.2'

/**
 * Yasal süreler ve eşikler — TEK KAYNAK (Faz 20'de mevzuattan doğrulandı).
 *
 * Metin sayfalarında sayı ELLE YAZILMAZ; üç sayfada üç farklı süre yazılı
 * olması tam da Faz 20'de bulunan kusurdu (bir sayfa "5-10 iş günü", diğeri
 * "14 gün" diyordu). Mevzuat değişirse tek yer güncellenir.
 */

/** Cayma hakkı süresi — MSY m.9/1. Mal teslim alındığı gün başlar. */
export const CAYMA_SURESI_GUN = 14

/**
 * Tüketicinin, cayma bildiriminden SONRA malı geri gönderme süresi — MSY m.13/1.
 * 23/8/2022-31932 değişikliğiyle 10 → 14 oldu; Geçici m.1 uyarınca iki kez
 * ertelendikten sonra 1/1/2026'da yürürlüğe girdi. Sayaç teslim tarihinden
 * değil, cayma BİLDİRİMİNİN yöneltildiği tarihten işler.
 */
export const GERI_GONDERME_GUN = 14

/** Satıcının geri ödeme süresi — MSY m.12/1. Teslim masrafları dâhil. */
export const GERI_ODEME_GUN = 14

/** Azami teslim süresi — MSY m.16/1 (kişiye özel ürünler hariç). */
export const AZAMI_TESLIM_GUN = 30

/** Ayıplı maldan sorumluluk zamanaşımı — 6502 s.K. m.12/1. */
export const AYIP_ZAMANASIMI_YIL = 2

/** Ayıbın teslim anında var sayıldığı süre — 6502 s.K. m.10/1. */
export const AYIP_ISPAT_AY = 6

/** Onarım/değişim taleplerinin karşılanma süresi — 6502 s.K. m.11/4. */
export const ONARIM_DEGISIM_IS_GUNU = 30

/**
 * Tüketici hakem heyeti parasal sınırı — 2026 yılı.
 * RG 23/12/2025-33116 sayılı Tebliğ m.3. İl/ilçe ayrımı 7392 sayılı Kanunla
 * kaldırıldı: TEK eşik. Her yıl yeniden değerleme oranında artar — yıl
 * başında güncelleyin.
 */
export const HAKEM_HEYETI_SINIRI_TL = 186_000
export const HAKEM_HEYETI_YILI = 2026

export const SOZLESME_YOLLARI = {
  onBilgilendirme: '/on-bilgilendirme-formu',
  mesafeliSatis: '/mesafeli-satis-sozlesmesi',
  caymaFormu: '/cayma-formu',
  kargoVeIade: '/kargo-ve-iade',
} as const

/**
 * Ürün görseli ve üretim toleransı (Faz 20).
 *
 * Amaç sorumluluk kaldırmak DEĞİL, beklenti yönetmek: el işçiliğinden doğan
 * küçük farklar ayıp sayılmaz, ama gerçek bir kusurda tüketicinin 6502 s.K.
 * m.11 hakları aynen saklıdır. İkinci cümle olmadan bu metin "ayıbı
 * sözleşmeyle bertaraf etme" girişimi sayılır ve haksız şart olurdu
 * (6502 m.5) — bu yüzden iki cümle ayrılmaz.
 */
export const URUN_TOLERANS_KISA =
  'Takılarımız el işçiliğiyle tamamlanır; renk tonu, taş yerleşimi ve simetride ürünler arasında küçük farklılıklar olabilir. Bunlar üretimin doğasıdır. Kırık, eksik parça ya da yanlış ürün gibi gerçek bir kusurda ayıplı mal haklarınız saklıdır.'

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
