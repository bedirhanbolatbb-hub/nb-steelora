import { groupProducts, type GroupableProduct, type ProductGroup } from './variants'

export const PER_PAGE = 24

/** Kart ve gruplama için gereken alanlar — açıklama gibi ağır kolonlar çekilmez. */
export const LISTING_COLUMNS =
  'id, slug, display_title, display_price, display_images, trendyol_stock, trendyol_category, gender, badge, avg_rating, review_count, created_at, variant_label, material_type'

export type ListingCard<T extends GroupableProduct = GroupableProduct> = {
  product: T
  optionCount: number
}

/**
 * Ürünleri gruplayıp sayfalar. Sayfalama artık ürün değil GRUP bazında yapılır;
 * "toplam" da görünen kart sayısıdır. Grup üyelerinin kendi sayfaları erişilir
 * kalır — yalnızca listede tek kart görünür.
 */
export function paginateGroupedProducts<T extends GroupableProduct>(
  products: T[],
  page: number,
  perPage = PER_PAGE,
  /** Sayfalamadan ÖNCE grupların sırasını düzenler (ör. `setleriGeriAl`). */
  duzenle?: (gruplar: ProductGroup<T>[]) => ProductGroup<T>[]
): { cards: ListingCard<T>[]; total: number; totalPages: number } {
  const ham = groupProducts(products)
  const groups = duzenle ? duzenle(ham) : ham
  const total = groups.length
  const start = (Math.max(1, page) - 1) * perPage

  return {
    cards: groups.slice(start, start + perPage).map((g) => ({
      product: g.cover,
      optionCount: g.optionCount,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

/**
 * "Önerilen" sıralamada setleri ilk satırların ARKASINA alır (24 Kas 2026
 * tasarım denetimi).
 *
 * KUSUR: /urunler ilk dokuz kartını setlerle açıyordu (en son eklenenler
 * onlar). Set kapakları üç fotoğraflı kolaj; liste, tek ürünlü sade karelerle
 * değil kalabalık kolajlarla başlıyor, tek parça arayan müşteri aradığını ilk
 * ekranda göremiyordu. Hiçbir ürün gizlenmez: ilk `onde` kart tekli ürün,
 * ardından setler, sonra kalanlar — kendi sıralarıyla.
 *
 * Yalnız varsayılan sıralamada kullanılır; müşteri "En Yeni" ya da fiyat
 * seçtiyse sıra onundur. Set tanımı menüdeki Setler kategorisiyle aynı
 * (adında "set" geçenler — lib/catalog/categories).
 */
export function setleriGeriAl<T extends GroupableProduct>(
  gruplar: ProductGroup<T>[],
  onde = 12
): ProductGroup<T>[] {
  const setMi = (g: ProductGroup<T>) => /set/i.test(String((g.cover as { display_title?: string | null }).display_title ?? ''))
  const tekler = gruplar.filter((g) => !setMi(g))
  const setler = gruplar.filter(setMi)
  if (setler.length === 0 || tekler.length === 0) return gruplar
  return [...tekler.slice(0, onde), ...setler, ...tekler.slice(onde)]
}

/**
 * Malzeme süzgeci (24 Kas 2026) — adres parametresi ↔ material_type.
 * Müşteri panelinde hassas ciltli ve "yalnız çelik" arayan kesim listeyi
 * malzemeye göre daraltamıyordu; malzeme yalnız ürün sayfasında yazıyordu.
 */
export const MALZEME_SUZGECI: { value: string; tip: string; label: string }[] = [
  { value: 'celik', tip: 'stainless_steel', label: '316L çelik' },
  { value: 'kaplama', tip: 'plated_brass', label: 'Kaplama pirinç' },
  { value: 'boncuk', tip: 'beaded', label: 'Boncuk ve doğal taş' },
]

/** Listede gerçekten bulunan malzemeler (boş seçenek basılmaz). */
export function malzemeSecenekleri(urunler: { material_type?: string | null }[]): { value: string; label: string }[] {
  const var_ = new Set(urunler.map((u) => u.material_type).filter(Boolean))
  const secenekler = MALZEME_SUZGECI.filter((m) => var_.has(m.tip)).map((m) => ({ value: m.value, label: m.label }))
  return secenekler.length > 1 ? secenekler : []
}

/** Parametreye göre süzer; bilinmeyen değer listeyi değiştirmez. */
export function malzemeyeGoreSuz<T extends { material_type?: string | null }>(urunler: T[], deger: string | undefined): T[] {
  const m = MALZEME_SUZGECI.find((x) => x.value === deger)
  return m ? urunler.filter((u) => u.material_type === m.tip) : urunler
}
