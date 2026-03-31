'use client'

import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProductCard from './ProductCard'

export default function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const { items } = useRecentlyViewed()
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const slugsToShow = items.filter((s) => s !== currentSlug).slice(0, 4)
    if (slugsToShow.length === 0) return

    const supabase = createClient()
    supabase
      .from('products_display')
      .select('*')
      .in('slug', slugsToShow)
      .then(({ data }) => {
        if (data) {
          // Keep the order from slugsToShow
          const sorted = slugsToShow
            .map((slug) => data.find((p) => p.slug === slug))
            .filter(Boolean)
          setProducts(sorted)
        }
      })
  }, [items, currentSlug])

  if (products.length === 0) return null

  return (
    <div className="mt-16 pt-16 border-t border-champagne-mid">
      <h2 className="font-heading text-[28px] font-light text-text-primary mb-8">
        Son Görüntüledikleriniz
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
