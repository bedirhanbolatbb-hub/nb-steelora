/**
 * Güven satırının metinleri — TEK KAYNAK (Faz 36).
 *
 * Ürün sayfasının güven şeridi ve sepet çekmecesi aynı vaatleri söyler;
 * ikisi ayrı ayrı elle yazılınca biri "14 gün iade", öteki "Koşulsuz iade"
 * demeye başlıyordu (aynı kusur kargo süresinde yaşandı, bkz. lib/shipping).
 * Kargo vaadi burada değil, lib/shipping.ts'te kalır.
 */
export const GUVEN_METNI = {
  iade: '14 gün iade',
  hediye: 'Hediye kutusu',
  // 7 Kas 2026: kart ödemesi kapalı (iyzico kaldırıldı). ETBİS kaydı footer'dan
  // doğrulanabilir; yeni iddia değil. 12 Kas 2026: kart (Tosla) açılınca da
  // doğru kalır — ödeme yönteminden bağımsız bir kayıt.
  odeme: 'ETBİS kayıtlı satıcı',
} as const

/**
 * Ödeme güvencesi cümlesi — ürün sayfası, sepet paneli ve /sepet (24 Kas 2026
 * tasarım denetimi). Müşteri panelinde en sık dile gelen eksik buydu: ödemenin
 * nasıl alındığı yalnız ödeme adımının ikinci ekranında yazıyordu.
 *
 * YENİ VAAT DEĞİL: /sss'teki "Nasıl ödeme yapabilirim?" cevabının
 * (lib/legal/sss `odemeCevabi`) kısa hâli. Kart açık mı sorusunu çağıran
 * verir (lib/tosla/client `kartOdemesiAcikMi`); bu dosya ortam değişkeni
 * okumaz. Tosla'nın kim olduğu da söylenir (Akbank iştiraki AkÖde'nin ödeme
 * hizmeti — akbank.com, İştiraklerimiz).
 *
 * Havale/EFT indirimi burada YAZMAZ: oran panelden değişir, ürün sayfası
 * önbellekten gelir; müşteri onu sepette ve ödeme adımında görür.
 */
export function odemeGuvenceSatiri(kartAcik: boolean): string {
  return kartAcik
    ? "Kart bilgileriniz, Akbank iştiraki AkÖde'nin ödeme hizmeti Tosla'nın güvenli sayfasında girilir; ödeme 3D Secure onayıyla tek çekim alınır. Havale/EFT de seçebilirsiniz."
    : 'Ödeme havale/EFT ile alınır; kart bilgisi istenmez. Alıcı ve IBAN siparişi onayladığınızda ekranda ve e-postanızda yer alır.'
}

/** Sepet gibi dar yerler için tek satırlık hâli. */
export function odemeGuvenceKisa(kartAcik: boolean): string {
  return kartAcik ? 'Kartla 3D Secure, tek çekim · ya da havale/EFT' : 'Ödeme havale/EFT ile'
}
