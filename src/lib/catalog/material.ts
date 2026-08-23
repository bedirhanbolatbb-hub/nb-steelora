/**
 * Malzeme beyanının tek kanonik kaynağı.
 * material_type dışında bir değer geldiğinde (ör. 'unknown') hiçbir şey
 * basılmaz — malzeme uydurulmaz.
 */
const MATERIAL_LABELS: Record<string, string> = {
  stainless_steel: '316L Paslanmaz Çelik',
  plated_brass: 'Premium Kaplama Pirinç',
  beaded: 'Boncuk & Doğal Taş',
}

/**
 * Beyan edilebilen malzemeler — panel seçenekleri, vitrin etiketi ve besleme
 * hepsi bu listeden türer. Yeni tip eklenirken DB'nin CHECK kısıtı da
 * genişletilmeli (bkz. docs/malzeme/01-beaded-tipi.sql).
 */
export const MALZEME_TIPLERI = ['stainless_steel', 'plated_brass', 'beaded'] as const

export type BeyanEdilenMalzeme = (typeof MALZEME_TIPLERI)[number]

/** DB'nin CHECK kısıtının kabul ettiği değerler. */
export type MalzemeTipi = BeyanEdilenMalzeme | 'unknown'

/** Panel seçim kutusu — etiketler tek kaynaktan. */
export const MALZEME_SECENEKLERI: { value: BeyanEdilenMalzeme; label: string }[] =
  MALZEME_TIPLERI.map((t) => ({ value: t, label: MATERIAL_LABELS[t] }))

export function beyanEdilenMalzemeMi(deger: unknown): deger is BeyanEdilenMalzeme {
  return typeof deger === 'string' && (MALZEME_TIPLERI as readonly string[]).includes(deger)
}

/**
 * Trendyol "Materyal" özniteliği (attributeId 14) → bizim tipimiz.
 *
 * Ölçüm (23.08.2026, 426 content): öznitelik 393'ünde DOLU ve değer uzayı
 * yalnız dört kanonik değerden ibaret:
 *   Paslanmaz Çelik 212 · Pirinç 160 · Çelik 12 · Boncuk 9
 *
 * `Boncuk` önce eşlenemiyordu (karşılığı olan tip yoktu) ve 9 yazlık halhal
 * 'unknown' kalıyordu. Boncuklu bir halhalı "Premium Kaplama Pirinç" diye
 * etiketlemek yanlış beyan olurdu; doğru çözüm tipi eklemek oldu: `beaded`.
 */
const TRENDYOL_MATERYAL: Record<string, MalzemeTipi> = {
  'paslanmaz çelik': 'stainless_steel',
  çelik: 'stainless_steel',
  pirinç: 'plated_brass',
  boncuk: 'beaded',
}

function kucult(deger: string | null | undefined): string {
  return (deger ?? '')
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** (a) Trendyol özniteliğinden malzeme — eşleşme yoksa null. */
export function malzemeOzniteliginden(attributeValue: string | null | undefined): MalzemeTipi | null {
  return TRENDYOL_MATERYAL[kucult(attributeValue)] ?? null
}

/**
 * (b) Başlıktan çıkarım — yalnız Trendyol özniteliği YOKKEN devreye girer.
 *
 * Ölçümde özniteliği eksik 33 content'in tamamı Piercing kategorisinde ve
 * başlıklarının çoğunda "Çelik Göbek Piercing" gibi açık bir beyan var.
 *
 * ÇAKIŞMADA KAPLAMA KAZANIR. Gerekçe veriden: operatörün elle etiketlediği
 * satırlarda "316L Çelik Gold Renk ZİNCİR ... Kolye" başlıkları plated_brass
 * girilmiş — oradaki "çelik" ürünün gövdesini değil zincirini anlatan jenerik
 * bir pazarlama sözcüğü. "pirinç"/"kaplama" ise bilinçli, spesifik beyan.
 */
export function malzemeBasliktan(title: string | null | undefined): MalzemeTipi | null {
  const t = kucult(title)
  if (!t) return null

  const kaplama = /(kaplama|pirinç)/.test(t)
  if (kaplama) return 'plated_brass'

  const celik = /(çelik|316l|paslanmaz)/.test(t)
  if (celik) return 'stainless_steel'

  // "Boncuklu" başlıklar metal beyanı taşımıyor; boncuk/doğal taş gövde.
  const boncuk = /(boncuk|doğal taş)/.test(t)
  if (boncuk) return 'beaded'

  return null
}

/**
 * Malzeme öncelik sırası: (a) Trendyol özniteliği → (b) başlık → (c) unknown.
 */
export function malzemeCoz(params: {
  ozellik?: string | null
  baslik?: string | null
}): MalzemeTipi {
  return (
    malzemeOzniteliginden(params.ozellik) ?? malzemeBasliktan(params.baslik) ?? 'unknown'
  )
}

/**
 * Mevcut değer korunmalı mı?
 *
 * `material_type`'ın kaynağını (elle mi, tahmin mi) ayırt eden bir sütun YOK:
 * denetim tablosu, trigger ya da `material_source` bulunmuyor; `updated_at`
 * de her senkronda eziliyor. Bu yüzden dolu bir değeri elle girilmiş kabul
 * edip ASLA ezmiyoruz — sync yalnız boş ('unknown' / null) satırları
 * dolduruyor. `gender` alanındaki "yalnız boşsa doldur" kalıbının aynısı.
 *
 * Sonuç: BB'nin panelden düzelttiği hiçbir satır senkronla geri dönmez.
 */
export function malzemeKorunsunMu(mevcut: string | null | undefined): boolean {
  return beyanEdilenMalzemeMi(mevcut)
}

/** Senkronun satıra yazacağı nihai değer. */
export function malzemeYazilacak(
  mevcut: string | null | undefined,
  turetilen: MalzemeTipi
): MalzemeTipi {
  if (malzemeKorunsunMu(mevcut)) return mevcut as MalzemeTipi
  return turetilen
}

export function materialLabel(materialType: string | null | undefined): string | null {
  if (!materialType) return null
  return MATERIAL_LABELS[materialType] ?? null
}

/** Malzemeye göre bakım cümlesi; malzeme bilinmiyorsa genel ifade. */
export function materialCare(materialType: string | null | undefined): string {
  if (materialType === 'stainless_steel') {
    return 'Suya, terlemeye ve parfüme dayanıklıdır. Nemli bir bezle silerek temizleyebilirsiniz.'
  }
  if (materialType === 'plated_brass') {
    return 'Kaplama yüzeyi korumak için parfüm, deniz ve havuz suyuyla temastan kaçının; kuru bir bezle silin.'
  }
  if (materialType === 'beaded') {
    return 'Boncuk ve doğal taş yüzeyler suyla uzun temasta matlaşabilir; kuru bir bezle silin, parfüm ve deniz suyundan uzak tutun.'
  }
  return 'Nemli bir bezle silerek temizleyin; parfüm ve kimyasallarla doğrudan temastan kaçının.'
}
