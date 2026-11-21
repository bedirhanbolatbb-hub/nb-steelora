/**
 * Banka yanıtının müşteriye ve panele Türkçe açıklaması (21 Kas 2026).
 *
 * Tosla, kartı reddeden bankanın yanıtını İngilizce ve kısa iletiyor (ör.
 * "Transaction is not valid."). Ödeme sayfasında müşteri bunu okuyup ne
 * yapacağını anlamıyor, "ödeme yapamıyorum" diye yazıyordu. Banka yanıt kodu
 * (ISO 8583) biliniyorsa ona, bilinmiyorsa mesajın kendisine bakılır.
 *
 * Uydurma yok: açıklamalar bu kodların bankalarca yaygın kullanılan
 * anlamlarıdır; kesin olmayan yerde "çoğunlukla" denir. Eşleşme yoksa null
 * döner, ekran bankanın kendi mesajını basar.
 *
 * Saf fonksiyon (tarayıcıda da çalışır): ödeme sonucu sayfası ve panel kullanır.
 */

const KODLAR: Record<string, string> = {
  '05':
    'Bankanız işlemi onaylamadı. Kartın internet alışverişine açık olduğunu bankanızın uygulamasından kontrol edebilir ya da başka bir kartla deneyebilirsiniz.',
  '12':
    'Bankanız işlemi geçersiz saydı. Bu çoğunlukla kartın internet alışverişine kapalı olmasından ya da kart türünün bu ödemeye izin vermemesinden kaynaklanır; bankanızın uygulamasından internet alışverişini açabilir ya da başka bir kartla deneyebilirsiniz.',
  '14': 'Kart numarası bankada bulunamadı. Numarayı kontrol edip yeniden deneyin.',
  '51': 'Kartınızın kullanılabilir limiti ya da bakiyesi bu tutar için yetersiz.',
  '54': 'Kartınızın son kullanma tarihi geçmiş görünüyor. Başka bir kartla deneyebilirsiniz.',
  '57':
    'Kartınız bu işleme kapalı; çoğunlukla internet alışverişi kapalıdır. Bankanızın uygulamasından açabilir ya da başka bir kartla deneyebilirsiniz.',
  '58': 'Bankanız bu kartla bu ödemeye izin vermedi. Başka bir kartla deneyebilirsiniz.',
  '61': 'Kartınızın işlem tutarı sınırı aşıldı. Bankanızın uygulamasından sınırı kontrol edebilirsiniz.',
  '62': 'Kartınız kısıtlı görünüyor. Bankanızla görüşebilir ya da başka bir kartla deneyebilirsiniz.',
  '65': 'Kartınızın günlük işlem sayısı sınırı doldu. Başka bir kartla ya da daha sonra deneyebilirsiniz.',
  '91': 'Bankanıza şu an ulaşılamadı. Birkaç dakika sonra yeniden deneyin.',
  '96': 'Bankanızın sisteminde geçici bir sorun oluştu. Birkaç dakika sonra yeniden deneyin.',
}

const UC_D =
  '3D Secure doğrulaması tamamlanamadı (bankanızın gönderdiği tek kullanımlık şifre adımı). Yeniden deneyebilir ya da başka bir kartla ödeyebilirsiniz.'

export function bankaYanitiAciklamasi(
  kod: string | null | undefined,
  mesaj: string | null | undefined
): string | null {
  const k = typeof kod === 'string' ? kod.trim() : ''
  if (k && KODLAR[k]) return KODLAR[k]
  const m = typeof mesaj === 'string' ? mesaj.toLocaleLowerCase('tr-TR') : ''
  if (!m) return null
  if (/3d|3-d|secure|notenrolled/.test(m)) return UC_D
  if (/not valid|invalid transaction|geçersiz işlem|gecersiz islem/.test(m)) return KODLAR['12']
  if (/do not honou?r|onaylanmad/.test(m)) return KODLAR['05']
  if (/insufficient|yetersiz/.test(m)) return KODLAR['51']
  if (/expired|süresi dolmuş|son kullanma/.test(m)) return KODLAR['54']
  if (/not permitted|izin verilmeyen|kapalı/.test(m)) return KODLAR['57']
  return null
}
