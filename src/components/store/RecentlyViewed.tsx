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
    <div className="mt-16 pt-16 border-t border-line">
      <div className="mb-8">
        <p className="eyebrow">Gezinme geçmişi</p>
        <h2 className="font-heading text-[26px] lg:text-[32px] font-medium text-ink mt-1.5">
          Son Görüntüledikleriniz
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {products.map((product) => (
          <ProductCardV2 key={product.id} product={product} morph={false} />
        ))}
      </div>
    </div>
  )
}
