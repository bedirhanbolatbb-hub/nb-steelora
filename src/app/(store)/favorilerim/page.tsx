'use client'

import { useWishlist } from '@/hooks/useWishlist'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProductGrid from '@/components/store/ProductGrid'
import Link from 'next/link'

export default function FavorilerimPage() {
  const { items } = useWishlist()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('products_display')
      .select('*')
      .in('id', items)
      .then(({ data }) => {
        setProducts(data || [])
        setLoading(false)
      })
  }, [items])

  return (
    <div className="min-h-[420px] max-w-[1400px] mx-auto px-4 lg:px-8 pt-6 pb-12 lg:py-14">
      <h1 className="font-heading text-[28px] lg:text-[40px] font-medium text-ink mb-6 lg:mb-10">
        Favorilerim
      </h1>

      {loading ? (
        <p className="text-muted font-body text-[14px] py-16">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <div className="max-w-[52ch] py-6">
          <p className="mb-6 font-body text-[15px] leading-relaxed text-ink-soft">
            Henüz favori ürününüz yok. Beğendiğiniz ürünün sayfasındaki kalp simgesine
            dokunduğunuzda ürün bu sayfada görünür.
          </p>
          <Link
            prefetch={false}
            href="/urunler"
            className="basis inline-flex min-h-[52px] items-center rounded-[4px] bg-ink px-8 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-accent-deep"
          >
            Tüm Ürünler
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  )
}
