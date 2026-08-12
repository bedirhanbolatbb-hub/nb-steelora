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
