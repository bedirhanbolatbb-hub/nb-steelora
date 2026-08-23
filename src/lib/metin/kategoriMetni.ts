import { cogulBulunma } from './ekler'

/**
 * Kategori ve koleksiyon tanıtım cümleleri (Faz 21).
 *
 * Ürünün kendisi hakkında iddia üretilmez: cümleler malzeme ve kullanım
 * çerçevesinde kalır. Kategoriye özel bir metin yoksa genel kalıba düşülür —
 * uydurma bir özellik yazılmaz.
 */

const KATEGORI_METINLERI: Record<string, string[]> = {
  kolye: [
    'İnce zincirlerden belirgin uçlara, günlük kullanıma uygun kolyeler.',
    'Tek başına ya da katmanlı kullanılabilen kolye seçkisi.',
    'Gündelik ve özel günler için sade kolyeler.',
  ],
  kupe: [
    'Halka, çivi ve sallantılı modelleriyle küpe seçkisi.',
    'Günlük kullanıma uygun, hafif küpeler.',
    'Sade formlardan belirgin tasarımlara küpeler.',
  ],
  bileklik: [
    'Zincir ve charm detaylı bileklikler.',
    'Tek başına ya da birlikte kullanılabilen bileklik seçkisi.',
    'Günlük kullanıma uygun bileklikler.',
  ],
  yuzuk: [
    'Ayarlanabilir ve ölçülü modelleriyle yüzükler.',
    'Sade bantlardan taş detaylı tasarımlara yüzükler.',
    'Tek başına ya da birlikte taşınabilen yüzükler.',
  ],
  piercing: [
    'Vücut takıları için hijyen mührüyle gönderilen piercingler.',
    'Çelik gövdeli piercing seçkisi.',
  ],
  erkek: [
    'Erkek modellerinde sade formlar ve dayanıklı malzeme.',
    'Günlük kullanıma uygun erkek takıları.',
  ],
  setler: [
    'Birlikte tasarlanmış, birlikte gönderilen setler.',
    'Kombin yapmayı kolaylaştıran set seçkisi.',
  ],
}

/** Kategori tanıtımı — slug'a özel metin yoksa genel kalıp. */
export function kategoriTanitimi(slug: string, baslik: string, adet?: number): string[] {
  const ozel = KATEGORI_METINLERI[slug]
  if (ozel) return ozel

  const tekil = baslik.toLocaleLowerCase('tr-TR')
  const konum = cogulBulunma(baslik).toLocaleLowerCase('tr-TR')
  return [
    `316L paslanmaz çelik ve premium kaplama seçenekleriyle ${tekil} seçkisi.`,
    `Günlük kullanıma uygun ${tekil} modelleri.`,
    `Sade formlardan belirgin tasarımlara, ${konum} geniş bir seçki.`,
    ...(adet ? [`${adet} farklı model arasından seçin.`] : []),
  ]
}

/** Koleksiyon tanıtımı — koleksiyon adı ve ürün sayısından. */
export function koleksiyonTanitimi(ad: string, adet?: number): string[] {
  const temiz = ad.trim()
  return [
    `${temiz} için bir araya getirilmiş parçalar.`,
    adet
      ? `${temiz} seçkisinde ${adet} parça.`
      : `${temiz} seçkisi.`,
    `Birlikte iyi duran, ayrı ayrı da taşınabilen bir seçki.`,
  ]
}

/** Kürasyon bölüm alt başlıkları. */
export const KURASYON_ALT_BASLIKLARI: Record<string, string[]> = {
  one_cikanlar: [
    'Bu ay en çok tercih edilenler',
    'Seçkinin öne çıkan parçaları',
    'En çok birlikte alınanlar',
  ],
  yeni_gelenler: [
    'Koleksiyona yeni katılanlar',
    'Bu haftanın yeni parçaları',
    'Yeni gelenler',
  ],
  cok_satanlar: [
    'En çok tercih edilenler',
    'Müşterilerin en çok seçtiği parçalar',
    'Sık tercih edilen modeller',
  ],
}
