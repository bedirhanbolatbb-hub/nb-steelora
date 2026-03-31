import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const categories = [
  { name: 'Kolye', slug: 'kolye', search: 'Kolye', settingsKey: 'category_kolye' },
  { name: 'Küpe', slug: 'kupe', search: 'Küpe', settingsKey: 'category_kupe' },
  { name: 'Yüzük', slug: 'yuzuk', search: 'Yüzük', settingsKey: 'category_yuzuk' },
  { name: 'Bileklik', slug: 'bileklik', search: 'Bileklik', settingsKey: 'category_bileklik' },
  { name: 'Setler', slug: 'setler', search: 'Set', settingsKey: 'category_setler' },
]

export default async function CategoryGrid() {
  const categoryImages: Record<string, string | null> = {}

  try {
    const service = createServiceClient()
    const supabase = await createClient()

    // Admin seçimleri — is_active filtresi yok
    const { data: settings } = await service
      .from('homepage_settings')
      .select('section, product_ids')
      .in('section', categories.map((c) => c.settingsKey))

    const adminIds = new Map<string, string>()
    if (settings) {
      for (const s of settings) {
        const pid = s.product_ids?.[0]
        if (pid) adminIds.set(s.section, pid)
      }
    }

    // Admin seçili ürünlerin görsellerini çek (is_active yok)
    const selectedIds = [...adminIds.values()].filter(Boolean)
    let adminProducts = new Map<string, string>()
    if (selectedIds.length > 0) {
      const { data } = await service
        .from('products')
        .select('id, trendyol_images')
        .in('id', selectedIds)
      if (data) {
        adminProducts = new Map(data.map((p) => [p.id, (p.trendyol_images as string[])?.[0]]))
      }
    }

    // Her kategori için görsel belirle
    for (const cat of categories) {
      const adminPid = adminIds.get(cat.settingsKey)
      if (adminPid && adminProducts.has(adminPid)) {
        categoryImages[cat.slug] = adminProducts.get(adminPid) || null
      } else {
        // Fallback: o kategoriden ilk aktif ürün
        const { data } = await supabase
          .from('products_display')
          .select('display_images')
          .ilike('trendyol_category', `%${cat.search}%`)
          .limit(1)
          .single()
        categoryImages[cat.slug] = data?.display_images?.[0] || null
      }
    }
  } catch {
    // Placeholder
  }

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 py-20">
      <h2 className="font-heading text-[32px] text-center text-text-primary mb-12">
        Kategoriler
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
        {categories.map((cat) => {
          const imageUrl = categoryImages[cat.slug]
          return (
            <Link key={cat.slug} href={`/kategori/${cat.slug}`} className="group">
              <div className="aspect-square bg-champagne-dark relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
                {imageUrl ? (
                  <Image src={imageUrl} alt={cat.name} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text-muted/30 text-[10px] font-body tracking-wider uppercase">{cat.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-heading text-[18px] text-champagne text-center">{cat.name}</h3>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
