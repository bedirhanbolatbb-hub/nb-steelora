import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CATEGORIES } from '@/lib/catalog/categories'
import { getCollectionCards } from '@/lib/collections'
import { groupProducts } from '@/lib/catalog/variants'

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
    // Faz 11F kapanış: indekslenebilir ama haritada olmayan sayfalar eklendi.
    // /sss özellikle önemli — 9 soruluk geçerli FAQPage şeması taşıyor.
    { url: `${baseUrl}/sss`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/on-bilgilendirme-formu`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/cayma-formu`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/cerez-politikasi`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/kargo-takip`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    // /giris ve /kayit ÇIKARILDI: içerikleri yok, başlıkları ana sayfanın
    // kopyası ve artık noindex. Haritada bildirmek Search Console'da
    // "yinelenen içerik" uyarısı üretiyordu.
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

  // Haritaya yalnız grup KAPAKLARI girer (Faz 18).
  //
  // Kardeş varyantların başlığı, açıklaması ve fiyatı birebir aynı; Search
  // Console 46 sayfayı bu yüzden "kopya" diye eledi. Artık kardeşlerin
  // canonical'ı kapağı gösteriyor — canonical'ı başkasına bakan sayfayı
  // haritada bildirmek "alternatif sayfa, uygun kurallı etiketle" uyarısı
  // üretirdi. Kardeş sayfalar erişilebilir ve iç bağlantılarla ulaşılabilir
  // kalır; yalnız indekslenmesini istediğimiz adres bildirilir.
  let productPages: MetadataRoute.Sitemap = []
  // Blog yazıları haritada hiç yoktu; yalnız /blog listesi vardı. Yazıların
  // kendi adresleri arama trafiğinin giriş kapısı, ayrı ayrı bildiriliyor.
  let blogPages: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products_display')
      .select(
        'id, slug, updated_at, display_title, display_price, trendyol_category, gender, trendyol_stock, created_at'
      )
      .limit(2000)

    const kapaklar = groupProducts((data || []).filter((p: any) => p.slug) as any[]).map(
      (g) => g.cover as any
    )

    productPages = kapaklar.map((p: any) => ({
      url: `${baseUrl}/urun/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // Ürünler alınamazsa statik + kategori haritası yine yayınlanır.
  }

  try {
    // blog_posts'ta anon SELECT politikası yok (yalnız service_role okur);
    // anon istemciyle sorgu boş dönüyor ve yazılar haritaya hiç girmiyordu.
    const supabase = createServiceClient()
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
