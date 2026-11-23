'use client'

import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useEffect, useState } from 'react'
import ProductCardV2 from './ProductCardV2'

export default function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const { items } = useRecentlyViewed()
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const slugsToShow = items.filter((s) => s !== currentSlug).slice(0, 4)
    if (slugsToShow.length === 0) return

    // 8 Kas 2026 (hız): Supabase istemcisi ilk yükte değil, burada iner.
    let iptal = false
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const { data } = await createClient()
        .from('products_display')
        .select('*')
        .in('slug', slugsToShow)
      if (iptal || !data) return
      // Keep the order from slugsToShow
      const sorted = slugsToShow
        .map((slug) => data.find((p) => p.slug === slug))
        .filter(Boolean)
      setProducts(sorted)
    })()
    return () => {
      iptal = true
    }
  }, [items, currentSlug])

  if (products.length === 0) return null

  return (
    <div className="mt-12 border-t border-line pt-10 lg:mt-16 lg:pt-14">
      <h2 className="mb-5 font-heading text-[24px] font-medium text-ink lg:mb-8 lg:text-[32px]">
        Son baktıklarınız
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-4 lg:gap-x-6">
        {products.map((product) => (
          <ProductCardV2 key={product.id} product={product} morph={false} />
        ))}
      </div>
    </div>
  )
}
