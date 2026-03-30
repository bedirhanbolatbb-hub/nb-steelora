import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

const categories = [
  { name: 'Kolye', slug: 'kolye', search: 'Kolye' },
  { name: 'Küpe', slug: 'kupe', search: 'Küpe' },
  { name: 'Yüzük', slug: 'yuzuk', search: 'Yüzük' },
  { name: 'Bileklik', slug: 'bileklik', search: 'Bileklik' },
  { name: 'Setler', slug: 'setler', search: 'Set' },
]

export default async function CategoryGrid() {
  let categoryImages: Record<string, string | null> = {}

  try {
    const supabase = await createClient()

    const results = await Promise.all(
      categories.map((cat) =>
        supabase
          .from('products_display')
          .select('display_images')
          .ilike('trendyol_category', `%${cat.search}%`)
          .limit(1)
          .single()
      )
    )

    categories.forEach((cat, i) => {
      const images = results[i].data?.display_images
      categoryImages[cat.slug] = images?.[0] || null
    })
  } catch {
    // Supabase yoksa placeholder
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
            <Link
              key={cat.slug}
              href={`/kategori/${cat.slug}`}
              className="group"
            >
              <div className="aspect-square bg-champagne-dark relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-text-muted/30 text-[10px] font-body tracking-wider uppercase">
                      {cat.name}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-heading text-[18px] text-champagne text-center">
                    {cat.name}
                  </h3>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
