/**
 * Kişiye özel kupon mailinin metin kütüphanesi (Faz 11E — Faz 21 deseni).
 *
 * BB panelden kupon üretirken metin yazmakla uğraşmasın: öneriler kurallı
 * kütüphaneden gelir, ölçüt docs/marka-sesi.md — ünlem yok, baskı dili yok,
 * "son şans / kaçırma" gibi aciliyet kurgusu yok. Alan boş bırakılırsa ilk
 * varyant basılır.
 *
 * Sözleşme: `uret()` TÜM adayları döndürür, pencereyi MetinOner kaydırır
 * (Faz 25 kusurunun düzeltmesi — üreteç sabit üçlü döndürmez).
 */

export type KuponMetni = { baslik: string; govde: string }

const VARYANTLAR: KuponMetni[] = [
  {
    baslik: 'Size özel bir indirim',
    govde:
      'Aşağıdaki kod yalnız sizin adınıza tanımlandı. Sepette kupon kutusuna ' +
      'yazmanız yeterli.',
  },
  {
    baslik: 'Sizin için ayırdık',
    govde:
      'Bu kod size özel; başka bir hesapta çalışmaz. Ödeme adımındaki kupon ' +
      'alanına yazabilirsiniz.',
  },
  {
    baslik: 'Bir teşekkür',
    govde:
      'Bizi tercih ettiğiniz için size özel bir kod tanımladık. Sepetinizde ' +
      'kupon kutusuna girmeniz yeterli.',
  },
  {
    baslik: 'Kodunuz hazır',
    govde:
      'Adınıza tanımlı indirim kodunuz aşağıda. Dilediğiniz siparişte, ' +
      'geçerlilik süresi içinde kullanabilirsiniz.',
  },
  {
    baslik: 'Yeni koleksiyona özel',
    govde:
      'Size özel tanımladığımız kod aşağıda. Sepette kupon kutusuna yazarak ' +
      'kullanabilirsiniz.',
  },
]

/** Panelde alan boşken kullanılan varsayılan. */
export const KUPON_VARSAYILAN: KuponMetni = VARYANTLAR[0]

/** Panel "Başka öner" için tam liste. */
export function kuponMetinleri(): KuponMetni[] {
  return VARYANTLAR
}
