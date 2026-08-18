import { createServiceClient } from '@/lib/supabase/service'
import type { Product } from '@/types'

/**
 * Blog yazısı → ürün kategorisi eşleşmesi (Faz 16).
 *
 * blog_posts'ta kategori alanı yok; yazının başlığı, özeti ve gövdesinde geçen
 * takı türü kelimeleri sayılarak en baskın olan seçilir. Eşleşme yoksa
 * kategori verilmez ve rail öne çıkan ürünlerle doldurulur — yazı sonu hiçbir
 * koşulda boş kalmaz.
 */

/** Vitrindeki `?kategori=` süzgeci `trendyol_category`'de ILIKE arar; anahtarlar ona göre. */
const ANAHTARLAR: { kategori: string; etiket: string; kelimeler: RegExp }[] = [
  { kategori: 'kolye', etiket: 'Kolye', kelimeler: /kolye|zincir|madalyon|ucu?\b/gi },
  { kategori: 'küpe', etiket: 'Küpe', kelimeler: /küpe|halka küpe|çivi küpe/gi },
  { kategori: 'bileklik', etiket: 'Bileklik', kelimeler: /bileklik|bilezik|charm/gi },
  { kategori: 'yüzük', etiket: 'Yüzük', kelimeler: /yüzük|alyans/gi },
  { kategori: 'piercing', etiket: 'Piercing', kelimeler: /piercing|helix|tragus/gi },
  { kategori: 'halhal', etiket: 'Halhal', kelimeler: /halhal/gi },
]

export function yaziKategorisi(metin: string): { kategori: string; etiket: string } | null {
  const havuz = metin.toLocaleLowerCase('tr-TR')
  let enIyi: { kategori: string; etiket: string; adet: number } | null = null

  for (const a of ANAHTARLAR) {
    const adet = (havuz.match(a.kelimeler) || []).length
    if (adet > 0 && (!enIyi || adet > enIyi.adet)) {
      enIyi = { kategori: a.kategori, etiket: a.etiket, adet }
    }
  }

  return enIyi ? { kategori: enIyi.kategori, etiket: enIyi.etiket } : null
}

/**
 * Yazının altındaki rail için ürünler. Stokta olan, aktif ürünlerden en çok
 * satanlar; kategori eşleşmesi yoksa öne çıkanlara düşülür. Aynı ürün iki kez
 * gelmez (kimliğe göre tekilleştirilir).
 */
export async function railUrunleri(kategori: string | null, adet = 3): Promise<Product[]> {
  const supabase = createServiceClient()

  const cek = async (kat: string | null) => {
    let q = supabase
      .from('products_display')
      .select('*')
      .gt('trendyol_stock', 0)
      .order('sales_count', { ascending: false })
      .limit(adet * 2)
    if (kat) q = q.ilike('trendyol_category', `%${kat}%`)
    const { data } = await q
    return (data ?? []) as Product[]
  }

  const secilen = new Map<string, Product>()
  for (const urun of await cek(kategori)) secilen.set(urun.id, urun)

  // Kategoride yeterli ürün yoksa (ya da eşleşme hiç yoksa) genel havuzdan tamamla.
  if (secilen.size < adet) {
    for (const urun of await cek(null)) {
      if (secilen.size >= adet) break
      secilen.set(urun.id, urun)
    }
  }

  return [...secilen.values()].slice(0, adet)
}
