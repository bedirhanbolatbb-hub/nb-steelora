import { groupProducts, type GroupableProduct } from './variants'

export const PER_PAGE = 24

/** Kart ve gruplama için gereken alanlar — açıklama gibi ağır kolonlar çekilmez. */
export const LISTING_COLUMNS =
  'id, slug, display_title, display_price, display_images, trendyol_stock, trendyol_category, gender, badge, avg_rating, review_count, created_at, variant_label'

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
  perPage = PER_PAGE
): { cards: ListingCard<T>[]; total: number; totalPages: number } {
  const groups = groupProducts(products)
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
