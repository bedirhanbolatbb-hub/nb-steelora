/**
 * Kupon kutusunun müşteriye söylediği şey (Faz 25).
 *
 * Önceden kod girildiğinde ya "Geçersiz ya da süresi dolmuş kod" yazıyordu ya
 * da HİÇBİR ŞEY olmuyordu: kod kabul ediliyor, kampanya bir koşula takılıyor
 * ve sessizce uygulanmıyordu. Müşteri kodun çalışıp çalışmadığını anlamıyordu.
 *
 * Burası SAF: veritabanı okumaz, hesap yapmaz. Girdi olarak "ne oldu"yu alır,
 * çıktı olarak müşteriye gösterilecek cümleyi verir. Böylece sepet ve ödeme
 * adımı aynı cümleyi basar — iki yerde iki farklı metin yazma riski yok.
 */

export type KuponDurumu =
  /** Kod hiç bulunamadı. */
  | { tip: 'bulunamadi' }
  /** Kod var ama kampanyanın tarihi geçmiş. */
  | { tip: 'suresi_dolmus' }
  /** Kod var ama kampanya henüz başlamamış. */
  | { tip: 'baslamadi' }
  /** Kod var ama kampanya kapatılmış. */
  | { tip: 'kapali' }
  /** Kod geçerli ama müşteri koşulu sağlamıyor. */
  | { tip: 'uygun_degil'; sebep?: string; eksikTutar?: number }
  /** Kod geçerli ama sepette daha avantajlı bir kampanya kazandı. */
  | { tip: 'golgelendi'; kazananAd?: string }
  /** Kod zaten otomatik uygulanan bir kampanyaya ait — hata değil. */
  | { tip: 'zaten_otomatik' }
  /** Kupon uygulandı. */
  | { tip: 'uygulandi' }

/** Kuruşlu tutarı "1.234,50 ₺" biçiminde yazar. */
function tl(n: number): string {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
}

/**
 * Müşteriye gösterilecek cümle. `null` dönerse kutuda hiçbir uyarı basılmaz
 * (kupon uygulandı ya da zaten otomatikti — indirim satırı zaten görünüyor).
 *
 * Ton ölçütü docs/marka-sesi.md: suçlayıcı değil, kısa, ünlemsiz.
 */
export function kuponMesaji(durum: KuponDurumu): string | null {
  switch (durum.tip) {
    case 'uygulandi':
    case 'zaten_otomatik':
      return null

    case 'bulunamadi':
      return 'Bu kodu bulamadık, kontrol eder misiniz?'

    case 'suresi_dolmus':
      return 'Bu kodun süresi dolmuş.'

    case 'baslamadi':
      // Süresi DOLMUŞ demek yanlış olurdu: kod ileride çalışacak.
      return 'Bu kod henüz kullanıma açılmadı.'

    case 'kapali':
      // Müşteri açısından kapatılmış kampanya ile süresi dolmuş kampanya
      // arasında bir fark yok; iç işleyişi anlatmanın anlamı da yok.
      return 'Bu kodun süresi dolmuş.'

    case 'golgelendi':
      return 'Sepetinizde daha avantajlı bir kampanya uygulanıyor — bu kod kullanılmadı, saklı kalır.'

    case 'uygun_degil': {
      const s = durum.sebep ?? ''
      if (s.includes('ilk alışveriş')) {
        return 'Bu kod ilk siparişlere özel. Size özel indirimleri e-posta ile gönderiyoruz.'
      }
      if (s.includes('üyelere')) {
        return 'Bu kod yalnız üyelere özel. Giriş yaptıktan sonra tekrar deneyin.'
      }
      if (s.includes('Sepet tutarı') && durum.eksikTutar && durum.eksikTutar > 0) {
        return `Bu kod için sepetinize ${tl(durum.eksikTutar)} daha eklemeniz gerekiyor.`
      }
      if (s.includes('ürün gerekli')) {
        return `Bu kod için sepetinizde daha fazla ürün olmalı — ${s.toLocaleLowerCase('tr-TR')}.`
      }
      if (s.includes('Kapsam') || s.includes('kapsam')) {
        return 'Bu kod sepetinizdeki ürünler için geçerli değil.'
      }
      // Tanımadığımız bir sebep: uydurmak yerine nötr ve doğru olanı söyle.
      return 'Bu kod sepetinizde geçerli değil.'
    }
  }
}

/** Uyarının tonu — sepet ve ödemede aynı renkte basılsın diye. */
export function kuponMesajTonu(durum: KuponDurumu): 'bilgi' | 'uyari' {
  // "Daha avantajlı kampanya var" bir hata değil, iyi haber; kırmızı basılmaz.
  return durum.tip === 'golgelendi' ? 'bilgi' : 'uyari'
}
