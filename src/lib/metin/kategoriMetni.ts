import { cogulBulunma } from './ekler'

/**
 * Kategori ve koleksiyon tanıtım cümleleri (Faz 21, Faz 25'te genişletildi).
 *
 * Ürünün kendisi hakkında iddia üretilmez: cümleler malzeme ve kullanım
 * çerçevesinde kalır. Kategoriye özel bir metin yoksa genel kalıba düşülür —
 * uydurma bir özellik yazılmaz.
 *
 * Faz 25: her kategoride yalnız ÜÇ cümle vardı; panelin "Başka öner" düğmesi
 * üç seçenek gösterdiği için havuz hiç dönmüyor, her tıklamada aynı üçlü
 * geliyordu. Havuzlar 8–10 cümleye çıkarıldı. Pencereyi MetinOner kaydırır;
 * burası TÜM adayları döndürür.
 *
 * Yeni cümleler docs/marka-sesi.md ölçütüyle denetlendi: kanıtlanamaz iddia
 * ("hafif", "en dayanıklı"), izin verilmeyen malzeme ("taş detaylı" — taş
 * ürüne göre değişen bir veri, sabit kategori metnine yazılamaz) ve değişken
 * bilgi ("geniş seçki") elendi.
 */

const KATEGORI_METINLERI: Record<string, string[]> = {
  kolye: [
    'İnce zincirlerden belirgin uçlara, günlük kullanıma uygun kolyeler.',
    'Tek başına ya da katmanlı kullanılabilen kolye seçkisi.',
    'Gündelik kullanıma ve özel günlere uygun sade kolyeler.',
    '316L paslanmaz çelik ve bijuteri seçenekleriyle kolyeler.',
    'İnce zincirlerle katmanlı kullanıma uygun kolye seçkisi.',
    'Belirgin uçlu kolyeler, sade bir kombini toparlamak için.',
    'Gümüş ve altın kaplama seçenekleriyle çelik kolyeler.',
    'Tek parça takmayı sevenler için sade zincir kolyeler.',
    'Özel günlerde de taşınabilen, sade formlu kolyeler.',
  ],
  kupe: [
    'Halka, çivi ve sallantılı modelleriyle küpe seçkisi.',
    'Sade formlardan belirgin tasarımlara küpeler.',
    'Çelik ve bijuteri seçenekleriyle küpe modelleri.',
    '316L paslanmaz çelik seçenekleriyle günlük kullanıma uygun küpeler.',
    'Altın ve gümüş kaplama seçenekleriyle küpe modelleri.',
    'Sade formlarıyla günlük kullanıma uygun küpe modelleri.',
    'Tek başına ya da diğer küpelerle birlikte taşınabilen modeller.',
    'Sade halkalardan detaylı sallantılara uzanan bir küpe seçkisi.',
    'Gündelik kombinler ve özel günler için küpe modelleri.',
  ],
  bileklik: [
    'Zincir ve charm detaylarıyla günlük kullanıma uygun bileklikler.',
    'Tek başına ya da birlikte kullanılabilen bileklik seçkisi.',
    'Çelik ve bijuteri seçenekleriyle günlük kullanıma uygun bileklikler.',
    'Zincir kalınlığı ve charm detayı değişen bileklik seçkisi.',
    '316L paslanmaz çelik seçenekleriyle bileklikler, günlük kullanıma uygun.',
    'İnce zincirlerden belirgin charm detaylarına bileklik modelleri.',
    'Tek başına sade, birlikte taşındığında belirgin bileklikler.',
    'Altın ve gümüş kaplama seçenekleriyle zincir bileklikler.',
    'Boncuk ve charm detaylı bileklikler, kombinlemeye uygun.',
    'Gündelik kullanım ve özel günler için bileklik seçkisi.',
  ],
  yuzuk: [
    'Ayarlanabilir modelleriyle, günlük kullanıma uygun yüzükler.',
    'Sade formlardan belirgin tasarımlara yüzükler.',
    'Tek başına ya da birlikte taşınabilen yüzükler.',
    'Günlük kullanıma uygun, ince bantlı yüzük seçkisi.',
    '316L paslanmaz çelik seçenekleriyle, gündelik kullanıma uygun yüzükler.',
    'Ölçüsünden emin olmayanlar için ayarlanabilir modeller.',
    'Diğer parçalarla kombinlemeye açık, sade formlu yüzükler.',
    'Çelik ve bijuteri seçenekleriyle yüzük modelleri.',
    'İnce bantlardan belirgin formlara uzanan yüzük seçkisi.',
  ],
  piercing: [
    'Vücut takıları için hijyen mührüyle gönderilen piercingler.',
    'Çelik gövdeli, günlük kullanıma uygun piercing seçkisi.',
    '316L paslanmaz çelik gövdeleriyle günlük kullanıma uygun piercingler.',
    'Çelik gövdeli modeller, hijyen mührüyle gönderilir.',
    'Titanyum ve çelik gövde seçenekleriyle piercing modelleri.',
    'Tek başına ya da birlikte taşınabilen piercing seçkisi.',
    'Günlük kullanım ve özel günler için çelik piercingler.',
    'İnce formlardan belirgin modellere uzanan piercing seçkisi.',
    'Altın ve gümüş kaplama seçenekleriyle çelik gövdeli piercingler.',
    'Kombinlemeye uygun, sade çelik piercing modelleri.',
  ],
  erkek: [
    'Erkek modellerinde sade formlar ve çelik gövde.',
    'Günlük kullanıma uygun, sade formlu erkek takıları.',
    '316L paslanmaz çelik seçenekleriyle erkek takı seçkisi.',
    'Çelik gövdeli, günlük kullanıma uygun erkek modelleri.',
    'Tek başına ya da birlikte taşınabilen erkek parçaları.',
    'Gündelik kombinlere uyan, abartısız erkek takıları.',
    'Sade formlardan belirgin tasarımlara erkek takıları.',
    'Özel gün ve gündelik kullanım için erkek parçaları.',
  ],
  setler: [
    'Birlikte taşınmak üzere bir araya getirilmiş parçalar.',
    'Kombin yapmayı kolaylaştıran, bir arada sunulan set seçkisi.',
    'Bir arada sunulan parçalar, tek başına da taşınabilir.',
    'Birlikte kullanılmak üzere bir arada sunulan parçalar.',
    'Çelik ve bijuteri seçenekleriyle hazırlanan set seçkisi.',
    'Gündelik kullanım ve özel günler için hazırlanan setler.',
    'Setteki parçalar birlikte de, ayrı ayrı da taşınabilir.',
    'Katmanlı taşımaya uygun parçaların bir arada sunulduğu setler.',
  ],
}

/** Kategori tanıtımı — slug'a özel metin yoksa genel kalıp. TÜM adaylar döner. */
export function kategoriTanitimi(slug: string, baslik: string, adet?: number): string[] {
  const ozel = KATEGORI_METINLERI[slug]
  if (ozel) return ozel

  const tekil = baslik.toLocaleLowerCase('tr-TR')
  const konum = cogulBulunma(baslik).toLocaleLowerCase('tr-TR')
  return [
    `316L paslanmaz çelik ve premium kaplama seçenekleriyle ${tekil} seçkisi.`,
    `Günlük kullanıma uygun ${tekil} modelleri.`,
    `Sade formlardan belirgin tasarımlara, ${konum} bir seçki.`,
    `Tek başına ya da birlikte taşınabilen ${tekil} modelleri.`,
    `Çelik ve bijuteri seçenekleriyle ${tekil} seçkisi.`,
    `Gündelik kullanım ve özel günler için ${tekil} modelleri.`,
    `Kombinlemeye uygun, sade formlu ${tekil} seçkisi.`,
    `Altın ve gümüş kaplama seçenekleriyle ${tekil} modelleri.`,
    ...(adet ? [`${adet} farklı model arasından seçin.`] : []),
  ]
}

/**
 * Koleksiyon tanıtım şablonları.
 *
 * `{ad}` koleksiyon adı, `{adet}` ürün sayısıdır. Şablonlar bilerek EK
 * GEREKTİRMEZ ("{ad} için", "{ad} seçkisi"): koleksiyon adının son sesi
 * bilinemeyeceği için "{ad}'e / {ad}'a" gibi ekler yanlış düşerdi.
 */
const KOLEKSIYON_SABLONLARI: string[] = [
  '{ad} seçkisinde birbirini tamamlayan parçalar yer alıyor.',
  '{ad} başlığı altında toplanan {adet} parçalık bir seçki.',
  '{ad} için seçilmiş parçalar tek bir sayfada toplandı.',
  '{ad}: gündelik ve özel günler arasında gidip gelen bir seçki.',
  '{ad} seçkisi, kombinlemeyi kolaylaştıran parçalardan oluşuyor.',
  '{ad} için sade ve belirgin formlar bir arada duruyor.',
  '{ad} seçkisindeki {adet} parça aynı çizgide buluşuyor.',
  '{ad} seçkisi, katmanlı ya da tek başına taşımaya uygun.',
  '{ad} temasıyla bir araya gelen parçaları tek listede topladık.',
  '{ad} için hazırlanan seçkide günlük kullanıma uygun parçalar var.',
]

/** Koleksiyon tanıtımı — koleksiyon adı ve ürün sayısından. TÜM adaylar döner. */
export function koleksiyonTanitimi(ad: string, adet?: number): string[] {
  const temiz = ad.trim()
  if (!temiz) return []
  return KOLEKSIYON_SABLONLARI
    // Ürün sayısı bilinmiyorsa {adet} geçen şablon kullanılamaz — "0 parça"
    // yazmak ya da yer tutucuyu olduğu gibi bırakmak ikisi de yanlış olurdu.
    .filter((s) => (adet && adet > 0 ? true : !s.includes('{adet}')))
    .map((s) => s.replaceAll('{ad}', temiz).replaceAll('{adet}', String(adet ?? 0)))
}

/** Kürasyon bölüm alt başlıkları. */
export const KURASYON_ALT_BASLIKLARI: Record<string, string[]> = {
  one_cikanlar: [
    'Bu ay en çok tercih edilenler',
    'Seçkinin öne çıkan parçaları',
    'En çok birlikte alınanlar',
    'Bu haftanın öne çıkanları',
    'Seçkiden öne çıkan parçalar',
    'Sık tercih edilen modeller',
  ],
  yeni_gelenler: [
    'Koleksiyona yeni katılanlar',
    'Bu haftanın yeni parçaları',
    'Yeni gelenler',
    'Seçkiye yeni eklenenler',
    'Yeni katılan modeller',
    'Bu ayın yeni parçaları',
  ],
  cok_satanlar: [
    'En çok tercih edilenler',
    'Müşterilerin en çok seçtiği parçalar',
    'Sık tercih edilen modeller',
    'En çok sipariş edilen parçalar',
    'Sık sipariş edilen modeller',
    'Müşterilerin sık seçtiği parçalar',
  ],
}
