import { VESILE_ADLARI, type Vesile } from './vesile'
import { VESILE_GIRISLERI } from './girisler'

/**
 * Hero hazır şablonları (Faz 22).
 *
 * BB'nin şikâyeti: "hero'yu nasıl kuracağı belli değil." Altı ayrı metin
 * alanını boş sayfadan doldurmak, mağaza sahibinden metin yazarlığı istemek
 * demekti. Artık şablon seçilir, alanlar bir kerede dolar, fotoğraf yüklenir.
 *
 * ARAŞTIRMADAN GELEN BİÇİM KURALLARI (11 premium site taraması):
 *  · Üst etiket neredeyse kullanılmıyor — metin render eden 8 siteden yalnız
 *    1'inde (Pandora) gerçek bir eyebrow var. Bu yüzden şablonlarda üst etiket
 *    KISA tutuluyor, "Sezon/hikâye" şablonunda hiç kullanılmıyor.
 *  · Metin satırı 2'yi geçmiyor: başlık + tek satır alt açıklama.
 *  · CTA sayısı 1. (6 sitede tam 1; yalnız COS iki tane kullanıyor, o da
 *    kadın/erkek ayrımı için.)
 *
 * Saf modül — panel önizlemesi ve testler doğrudan çağırabilsin diye.
 */

export type HeroAlanlari = {
  hero_badge: string
  hero_title_line1: string
  hero_title_line2: string
  hero_title_line3: string
  hero_description: string
  hero_cta: string
}

export type HeroSablonu = {
  kimlik: 'yeni_koleksiyon' | 'kampanya' | 'sezon_hikaye'
  ad: string
  aciklama: string
}

export const HERO_SABLONLARI: HeroSablonu[] = [
  {
    kimlik: 'yeni_koleksiyon',
    ad: 'Yeni koleksiyon',
    aciklama: 'Yeni gelen parçaları duyurur. Üst etikette "YENİ KOLEKSİYON" yazar.',
  },
  {
    kimlik: 'kampanya',
    ad: 'Kampanya',
    aciklama: 'Yürürlükteki indirimi öne çıkarır. Üst etiket kampanya metnini taşır.',
  },
  {
    kimlik: 'sezon_hikaye',
    ad: 'Sezon / hikâye',
    aciklama: 'Ürün değil marka anlatır. Üst etiket kullanılmaz, en sakin seçenek.',
  },
]

export type HeroBaglami = {
  vesile?: Vesile
  /** Yürürlükteki kampanyanın vitrin metni — 'kampanya' şablonu bunu kullanır. */
  kampanyaMetni?: string | null
  /** Öne çıkarılacak koleksiyon adı, varsa. */
  koleksiyonAdi?: string | null
}

/** Üç satırlık başlık kümeleri — hepsi kısa, ünlemsiz, iddiasız. */
const BASLIKLAR: Record<HeroSablonu['kimlik'], [string, string, string][]> = {
  yeni_koleksiyon: [
    ['Yeni', 'gelenler', 'burada'],
    ['Sezonun', 'yeni', 'parçaları'],
    ['Koleksiyona', 'yeni', 'katılanlar'],
  ],
  kampanya: [
    ['Şimdi', 'daha', 'uygun'],
    ['Seçtiğiniz', 'parça', 'indirimde'],
    ['Beklediğiniz', 'fiyat', 'burada'],
  ],
  sezon_hikaye: [
    ['Her anın', 'zarif', 'tanığı'],
    ['Sade', 'kalmayı', 'seçenler'],
    ['Gündelik', 'olanın', 'inceliği'],
  ],
}

const ACIKLAMALAR: Record<HeroSablonu['kimlik'], string[]> = {
  yeni_koleksiyon: [
    '316L paslanmaz çelik ve premium kaplama. Kararmaz, paslanmaz, solmaz.',
    'Günlük kullanıma uygun, hafif ve dayanıklı parçalar.',
    'Tek başına ya da katmanlı kullanılabilen yeni modeller.',
  ],
  kampanya: [
    'Tüm siparişlerde kargo ücretsiz, 14 gün koşulsuz iade.',
    'İndirim sepette otomatik uygulanır.',
    'Seçtiğiniz parçalar, beklediğiniz fiyata.',
  ],
  sezon_hikaye: [
    '316L medikal çelik. Kararmaz, paslanmaz, solmaz.',
    'Her gün takılacak kadar sade, hatırlanacak kadar özel.',
    'Az sayıda parça, uzun süre kullanım.',
  ],
}

const CTA: Record<HeroSablonu['kimlik'], string[]> = {
  yeni_koleksiyon: ['Yeni Gelenleri Gör', 'Koleksiyonu Keşfet'],
  kampanya: ['Kampanyayı Gör', 'İndirimli Ürünler'],
  sezon_hikaye: ['Koleksiyonu Keşfet', 'Keşfet'],
}

function sec<T>(dizi: T[], sira: number): T {
  return dizi[((sira % dizi.length) + dizi.length) % dizi.length]
}

/**
 * Şablondan hero alanlarını üretir.
 * @param sira "Başka öner" her basıldığında artar; alternatifler arasında gezer.
 */
export function heroSablonuUygula(
  kimlik: HeroSablonu['kimlik'],
  baglam: HeroBaglami = {},
  sira = 0
): HeroAlanlari {
  const [s1, s2, s3] = sec(BASLIKLAR[kimlik], sira)

  let badge = ''
  if (kimlik === 'yeni_koleksiyon') {
    badge = (baglam.koleksiyonAdi || 'Yeni Koleksiyon').toLocaleUpperCase('tr-TR')
  } else if (kimlik === 'kampanya') {
    // Kampanya metni yoksa vesile açılışına düş; o da yoksa üst etiket boş
    // kalır — uydurma bir duyuru yazılmaz.
    const giris = sec(VESILE_GIRISLERI[baglam.vesile ?? 'yok'] ?? [], sira)
    badge = (baglam.kampanyaMetni || giris || '').toLocaleUpperCase('tr-TR')
  }
  // 'sezon_hikaye' üst etiket KULLANMAZ — araştırmada premium normu bu.

  return {
    hero_badge: badge,
    hero_title_line1: s1,
    hero_title_line2: s2,
    hero_title_line3: s3,
    hero_description: sec(ACIKLAMALAR[kimlik], sira),
    hero_cta: sec(CTA[kimlik], sira),
  }
}

/** Panelde şablon kartının altında gösterilecek tek satırlık özet. */
export function heroSablonOzeti(kimlik: HeroSablonu['kimlik'], vesile?: Vesile): string {
  if (kimlik === 'sezon_hikaye' && vesile && vesile !== 'yok') {
    return `Sezon: ${VESILE_ADLARI[vesile]}`
  }
  return HERO_SABLONLARI.find((s) => s.kimlik === kimlik)?.aciklama ?? ''
}
