import Link from 'next/link'
import Image from 'next/image'
import { BLUR_PLACEHOLDER, IMAGE_QUALITY } from '@/lib/images'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CATEGORIES, buildCategoryFilter } from '@/lib/catalog/categories'

/**
 * Kategoriler v2 — yatay kaydırmalı şerit (7 kapak).
 * Görsel çözümü eski CategoryGrid ile aynı: panel Kürasyon'daki seçim,
 * yoksa kategorinin ilk aktif ürünü.
 */
export default async function CategoryRail() {
  const categoryImages: Record<string, string | null> = {}

  try {
    const service = createServiceClient()
    const supabase = await createClient()

    const { data: settings } = await service
      .from('homepage_settings')
      .select('section, product_ids')
      .in('section', CATEGORIES.map((c) => `category_${c.slug}`))

    const adminIds = new Map<string, string>()
    for (const s of settings || []) {
      const pid = s.product_ids?.[0]
      if (pid) adminIds.set(s.section, pid)
    }

    const selectedIds = [...adminIds.values()]
    let adminProducts = new Map<string, string>()
    if (selectedIds.length > 0) {
      const { data } = await service
        .from('products')
        .select('id, trendyol_images')
        .in('id', selectedIds)
      adminProducts = new Map(
        (data || []).map((p: any) => [p.id, (p.trendyol_images as string[])?.[0]])
      )
    }

    for (const cat of CATEGORIES) {
      const adminPid = adminIds.get(`category_${cat.slug}`)
      if (adminPid && adminProducts.has(adminPid)) {
        categoryImages[cat.slug] = adminProducts.get(adminPid) || null
        continue
      }
      const filter = buildCategoryFilter(cat)
      let query = supabase.from('products_display').select('display_images')
      query = filter.kind === 'eq' ? query.eq(filter.column, filter.value) : query.or(filter.expression)
      const { data } = await query.limit(1).maybeSingle()
      categoryImages[cat.slug] = data?.display_images?.[0] || null
    }
  } catch {
    // Yer tutucu kalır
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16 lg:py-20">
      <div className="mb-8 text-center" data-reveal>
        <p className="eyebrow">Keşfet</p>
        <h2 className="font-heading text-[30px] lg:text-[36px] font-medium text-ink mt-2">Kategoriler</h2>
      </div>

      {/* Yatay şerit — kaydırma kendi kabında, sayfa taşmaz */}
      <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-4 lg:gap-5 snap-x snap-mandatory min-w-max lg:min-w-0 lg:justify-center">
          {CATEGORIES.map((cat, i) => {
            const imageUrl = categoryImages[cat.slug]
            return (
              <Link
                key={cat.slug}
                href={`/kategori/${cat.slug}`}
                className="group w-[150px] lg:w-[164px] shrink-0 snap-start"
                data-reveal
                style={{ '--reveal-delay': `${i * 35}ms` } as React.CSSProperties}
              >
                <div className="aspect-[3/4] relative overflow-hidden rounded-[4px] bg-surface-muted">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={cat.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      sizes="164px"
                      quality={IMAGE_QUALITY}
                      placeholder="blur"
                      blurDataURL={BLUR_PLACEHOLDER}
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-muted/30 text-[10px] font-body tracking-wider uppercase">
                      {cat.title}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
                  <p className="absolute inset-x-0 bottom-3 text-center font-heading text-[15px] text-bg">
                    {cat.title}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
