/**
 * Menü ve /kategori/[slug] sayfalarının tek kaynağı.
 *
 * Kural: hiçbir aktif ürün menüden erişilemez kalmayacak. Veride 11 farklı
 * trendyol_category var; aşağıdaki tanımlar bunların tamamını kapsar:
 *   Kolye    → Çelik Kolye, Bijuteri Kolye
 *   Küpe     → Çelik Küpe, Bijuteri Küpe
 *   Bileklik → Çelik Bileklik, Bijuteri Bileklik, Bilezik, Bijuteri Halhal
 *   Yüzük    → Çelik Yüzük, Bijuteri Yüzük
 *   Piercing → Piercing
 * Erkek (gender='men') ve Setler (başlıkta "set" geçenler) bu kümelerin
 * kesitleridir, kapsama ek yapmazlar.
 */

export type CategoryChip = {
  value: string
  label: string
  patterns: string[]
}

export type CategoryDef = {
  slug: string
  title: string
  /** trendyol_category üzerinde ilike ile eşleşen desenler */
  patterns?: string[]
  /** gender kolonu eşitliği (erkek segmenti) */
  gender?: string
  /** display_title üzerinde ilike — kategori verisi olmayan gruplar için */
  titlePatterns?: string[]
  /** Liste üstünde gösterilen daraltma çipleri */
  chips?: CategoryChip[]
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'kolye', title: 'Kolye', patterns: ['Kolye'] },
  { slug: 'kupe', title: 'Küpe', patterns: ['Küpe'] },
  {
    slug: 'bileklik',
    title: 'Bileklik',
    // Bilezik (1 ürün) ve Halhal (9 ürün) ayrı menü maddesi değil, bu listenin içinde.
    patterns: ['Bileklik', 'Bilezik', 'Halhal'],
    chips: [{ value: 'halhal', label: 'Halhal', patterns: ['Halhal'] }],
  },
  { slug: 'yuzuk', title: 'Yüzük', patterns: ['Yüzük'] },
  { slug: 'piercing', title: 'Piercing', patterns: ['Piercing'] },
  { slug: 'erkek', title: 'Erkek', gender: 'men' },
  { slug: 'setler', title: 'Setler', titlePatterns: ['set'] },
]

export const MENU_LINKS = [
  ...CATEGORIES.map((c) => ({ href: `/kategori/${c.slug}`, label: c.title })),
  { href: '/blog', label: 'Blog' },
]

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

/** Sorguya uygulanacak filtre tanımı — Supabase tiplerinden bağımsız tutulur. */
export type CategoryFilter =
  | { kind: 'eq'; column: string; value: string }
  | { kind: 'or'; expression: string }

/**
 * Kategori tanımını (ve seçiliyse çipi) filtre tanımına çevirir.
 * Yalnızca görüntüleme katmanı — ürün slug/URL'lerine dokunmaz.
 */
export function buildCategoryFilter(def: CategoryDef, chipValue?: string): CategoryFilter {
  if (def.gender) {
    return { kind: 'eq', column: 'gender', value: def.gender }
  }

  if (def.titlePatterns) {
    return {
      kind: 'or',
      expression: def.titlePatterns.map((p) => `display_title.ilike.%${p}%`).join(','),
    }
  }

  const chip = def.chips?.find((c) => c.value === chipValue)
  const patterns = chip?.patterns ?? def.patterns ?? []
  return {
    kind: 'or',
    expression: patterns.map((p) => `trendyol_category.ilike.%${p}%`).join(','),
  }
}

/**
 * /urunler filtresinde gösterilecek kategoriler (Faz 11A).
 *
 * Menüdeki 7 kategori + Halhal. Halhal menüde ayrı madde değil (Bileklik'in
 * içinde bir çip) ama katalogda 9 ürünü var ve filtrede aranabilir olması
 * gerekiyor. Trendyol'un ham kategori adları HİÇ görünmez.
 */
export const FILTRE_KATEGORILERI: { slug: string; title: string; patterns: string[] }[] = [
  ...CATEGORIES.map((c) => ({
    slug: c.slug,
    title: c.title,
    patterns: c.patterns ?? c.titlePatterns ?? [c.title],
  })),
  { slug: 'halhal', title: 'Halhal', patterns: ['Halhal'] },
]

/** Marka kategorisi adından Trendyol desenlerini bulur (filtre eşleştirmesi). */
export function filtreDesenleri(baslik: string): string[] {
  const k = FILTRE_KATEGORILERI.find((c) => c.title === baslik)
  return k?.patterns ?? [baslik]
}

/**
 * Ham Trendyol kategorisini MARKA kategorisine çevirir (Faz 11A).
 *
 * Müşteriye "Bijuteri Bileklik" ya da "Çelik Kolye" diye tedarikçi
 * sınıflandırması gösteriliyordu — arama sonucunda, kartın altında, sepet
 * satırında. Menüde ve süzgeçte "Bileklik" yazarken aynı ürünün altında
 * "Bijuteri Bileklik" yazması iki ayrı taksonomi izlenimi veriyor.
 *
 * Eşleşme bulunamazsa ham değer OLDUĞU GİBİ döner: uydurma etiket basmaktansa
 * elimizdekini göstermek daha dürüst.
 */
export function markaKategorisi(ham: string | null | undefined): string {
  const metin = String(ham ?? '').trim()
  if (!metin) return ''
  const kucuk = metin.toLocaleLowerCase('tr-TR')
  // Halhal, Bileklik'in desenlerinde de geçiyor; önce daha özel olan denenir.
  const sirali = [...FILTRE_KATEGORILERI].sort((a, b) => b.patterns.length - a.patterns.length)
  const halhal = sirali.find((c) => c.slug === 'halhal')
  if (halhal && kucuk.includes('halhal')) return halhal.title
  for (const k of FILTRE_KATEGORILERI) {
    if (k.patterns.some((d) => kucuk.includes(d.toLocaleLowerCase('tr-TR')))) return k.title
  }
  return metin
}
