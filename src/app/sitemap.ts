import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/catalog/categories'
import { getCollectionCards } from '@/lib/collections'

const baseUrl = 'https://www.nbsteelora.com'

// Ürün listesi günde bir tazelenir.
export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/urunler`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/hakkimizda`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/iletisim`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/kargo-ve-iade`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/kvkk`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/gizlilik-politikasi`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/mesafeli-satis-sozlesmesi`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/giris`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/kayit`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${baseUrl}/kategori/${c.slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Küratörlü koleksiyonlar — adres listesi admin verisinden üretilir.
  const collectionPages: MetadataRoute.Sitemap = (await getCollectionCards()).map((c) => ({
    url: `${baseUrl}/koleksiyon/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Gruplama yalnız listede tek kart gösteriyor; her üyenin kendi sayfası
  // ayrı URL olarak burada kalır (kapak olmayan üyeler de indekslenebilsin).
  let productPages: MetadataRoute.Sitemap = []
  // Blog yazıları haritada hiç yoktu; yalnız /blog listesi vardı. Yazıların
  // kendi adresleri arama trafiğinin giriş kapısı, ayrı ayrı bildiriliyor.
  let blogPages: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products_display')
      .select('slug, updated_at')
      .limit(2000)

    productPages = (data || [])
      .filter((p: any) => p.slug)
      .map((p: any) => ({
        url: `${baseUrl}/urun/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  } catch {
    // Ürünler alınamazsa statik + kategori haritası yine yayınlanır.
  }

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('published', true)
      .limit(500)

    blogPages = (data || [])
      .filter((p: any) => p.slug)
      .map((p: any) => ({
        url: `${baseUrl}/blog/${p.slug}`,
        lastModified: p.updated_at || p.published_at ? new Date(p.updated_at || p.published_at) : now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
  } catch {
    // Yazılar alınamazsa harita yine yayınlanır.
  }

  return [...staticPages, ...categoryPages, ...collectionPages, ...blogPages, ...productPages]
}
