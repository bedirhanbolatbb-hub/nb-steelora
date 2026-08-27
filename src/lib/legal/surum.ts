import { CONSENT_VERSION } from '@/lib/analytics/consent'
import { SOZLESME_SURUMU } from './sozlesme'

/**
 * Hukuki metinlerin sürüm ve yürürlük bilgisi — TEK KAYNAK (Faz 26).
 *
 * Çerez politikasında "Sürüm:" satırı vardı ama yürürlük tarihi hiç
 * basılmıyordu: panel alanı (`site_content.cerez_politikasi_yururluk`) boştu
 * ve boşken satır tamamen düşüyordu. KVKK aydınlatma metni ile mesafeli satış
 * sözleşmesinde ise ne sürüm ne tarih vardı.
 *
 * Yürürlük tarihi hukuken önemli: tüketici hangi tarihli metne tabi olduğunu,
 * biz de hangi sürüme onay alındığını bilmeliyiz. Bu yüzden artık boş
 * bırakılamaz — panel doldurulmadıysa buradaki tarih basılır.
 *
 * BU TARİHLERİ, metinde ESASA ilişkin bir değişiklik yaptığınızda güncelleyin.
 * Yazım düzeltmesi için değiştirmeye gerek yok.
 */

export type MetinSurumu = {
  /** Sürüm etiketi — rıza kaydıyla eşleşmesi gereken yerlerde o değer kullanılır. */
  surum: string
  /** ISO tarih (YYYY-AA-GG). Ekranda GG.AA.YYYY olarak basılır. */
  yururluk: string
}

/** Çerez politikası — sürümü rıza kaydıyla AYNI olmak zorunda. */
export const CEREZ_SURUMU: MetinSurumu = {
  surum: CONSENT_VERSION,
  yururluk: '2026-08-23',
}

/** KVKK aydınlatma metni. Faz 23'te üye hareketi paragrafı eklendi. */
export const KVKK_SURUMU: MetinSurumu = {
  // Faz 28: T.C. kimlik numarası toplanmadığı açıkça yazıldı, kurumsal fatura
  // verisi eklendi.
  surum: 'v1.2',
  yururluk: '2026-08-24',
}

/** Mesafeli satış sözleşmesi ve ön bilgilendirme formu. */
export const MESAFELI_SURUMU: MetinSurumu = {
  surum: SOZLESME_SURUMU,
  // Faz 11F: teslimat maddesindeki hazırlık/taşıma ayrımı esasa ilişkin
  // değişiklik sayıldı (BB kararı). Damga sipariş anında orders.metadata'ya
  // YAZILDIĞI için eski siparişlerin onay kaydı olduğu gibi kalır.
  yururluk: '2026-08-27',
}

/** ISO tarihi GG.AA.YYYY biçimine çevirir. Geçersizse olduğu gibi döner. */
export function tarihYaz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso.trim()
  return `${m[3]}.${m[2]}.${m[1]}`
}

/**
 * Sayfanın altına basılacak sürüm bloğu.
 *
 * Panelden gelen değerler önceliklidir; boşsa koddaki sürüm ve tarih basılır.
 * Yürürlük satırı ARTIK HİÇBİR KOŞULDA düşmez — eskiden boş alan satırı
 * tamamen kaldırıyordu ve sayfada yalnız "Sürüm:" görünüyordu.
 */
export function surumBloguHtml(
  varsayilan: MetinSurumu,
  panel?: { surum?: string | null; yururluk?: string | null },
  ekNot?: string
): string {
  const surum = (panel?.surum ?? '').trim() || varsayilan.surum
  const ham = (panel?.yururluk ?? '').trim() || varsayilan.yururluk
  // Panel GG.AA.YYYY girmiş olabilir; ISO ise çevrilir, değilse olduğu gibi.
  const yururluk = tarihYaz(ham)
  return `
<hr>
<p><small>
<strong>Sürüm:</strong> ${surum}<br>
<strong>Yürürlük tarihi:</strong> ${yururluk}<br>
${ekNot ?? ''}
</small></p>`.trim()
}
