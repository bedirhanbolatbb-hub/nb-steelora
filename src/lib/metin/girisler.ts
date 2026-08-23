import type { Vesile } from './vesile'

/**
 * Vesile açılışları (Faz 21) — docs/marka-sesi.md ölçütüne göre yazıldı.
 *
 * Kural: vesile bahane değildir. "Anneler Günü için" yeterlidir; "Annenizi
 * mutlu edin, kaçırmayın!" değil. Ünlem, emoji ve aciliyet dili yok.
 * 'yok' vesilesinde açılış hiç kullanılmaz — metin sade kalır.
 */
export const VESILE_GIRISLERI: Record<Vesile, string[]> = {
  ilkbahar: [
    'İlkbahara zarif bir başlangıç',
    'Yeni mevsim, yeni parçalar',
    'Bahar için sade seçimler',
    'Hafifleyen günlere',
  ],
  yaz: [
    'Yaza hafif bir dokunuş',
    'Yaz için ince parçalar',
    'Güneşli günlere',
    'Sade bir yaz seçkisi',
  ],
  sonbahar: [
    'Sonbahara zarif bir başlangıç',
    'Serinleyen günlere',
    'Sonbahar için sıcak tonlar',
    'Yeni sezon başlarken',
  ],
  kis: [
    'Kışa sıcak bir dokunuş',
    'Uzun akşamlar için',
    'Kış için sade parçalar',
    'Yılın en sakin mevsimine',
  ],
  yilbasi: [
    'Yeni yıla hazırlık',
    'Yılbaşı hediyeleri',
    'Yeni yıl için sade seçimler',
    'Yılın son günlerine',
  ],
  sevgililer: [
    'Sevgililer Günü için',
    'İki kişilik bir seçim',
    'Anlamlı ve sade bir hediye',
    '14 Şubat için',
  ],
  anneler_gunu: [
    'Anneler Günü için',
    'Anneye özel seçimler',
    'Onun için sade bir hediye',
    'Teşekkür etmenin zarif yolu',
  ],
  ogretmenler_gunu: [
    'Öğretmenler Günü için',
    'Teşekkür etmenin sade yolu',
    '24 Kasım için',
  ],
  ramazan_bayrami: [
    'Bayram hazırlığı',
    'Bayrama özel seçimler',
    'Bayramlık için',
  ],
  kurban_bayrami: [
    'Bayram hazırlığı',
    'Bayrama özel seçimler',
    'Bayramlık için',
  ],
  okula_donus: [
    'Yeni döneme başlarken',
    'Okula dönüş için',
    'Yeni bir başlangıca',
  ],
  kara_cuma: [
    'Kara Cuma',
    'Kasım indirimleri',
    'Yılın en geniş indirimi',
  ],
  yeni_koleksiyon: [
    'Yeni koleksiyon',
    'Yeni gelenler',
    'Koleksiyona yeni katılanlar',
  ],
  stok_sonu: [
    'Sezon sonu',
    'Kalan adetler',
    'Sezonu kapatırken',
  ],
  marka_dogum_gunu: [
    'Kuruluş yıl dönümü',
    'Bir yılı daha geride bıraktık',
    'Yıl dönümüne özel',
  ],
  ilk_musteri: [
    'İlk siparişinize özel',
    'Aramıza hoş geldiniz',
    'İlk alışverişiniz için',
  ],
  yok: [],
}
