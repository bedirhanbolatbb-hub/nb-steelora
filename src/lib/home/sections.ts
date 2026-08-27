import { getGroupKey, type GroupableProduct } from '@/lib/catalog/variants'

// Anasayfadaki hiçbir bölüm bu sayıdan fazla kart basmaz. Panel de aynı
// tavanı kullanır (api/panel/curation): panelde N seçiliyse vitrinde N kart.
export const MAX_SECTION_ITEMS = 8

/**
 * Bölümler arası tekilleştirme kümesi. Bir ürün üst bölümde basıldıysa
 * kendisi de grubundan bir kardeşi de alt bölümde tekrar basılmaz.
 */
export class ShownProducts {
  private ids = new Set<string>()
  private groups = new Set<string>()

  add(products: GroupableProduct[]) {
    for (const p of products) {
      this.ids.add(p.id)
      this.groups.add(getGroupKey(p))
    }
  }

  has(product: GroupableProduct): boolean {
    return this.ids.has(product.id) || this.groups.has(getGroupKey(product))
  }
}

// Faz 9A: getHeroProducts / getHomepageSection buradan kaldırıldı — anasayfanın
// tek veri katmanı artık homeData.ts (tek Promise.all + süreç içi TTL önbelleği).
