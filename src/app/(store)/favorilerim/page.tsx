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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] font-light text-text-primary mb-2">
        Favorilerim
      </h1>
      <div className="w-16 h-px bg-gold mb-10" />

      {loading ? (
        <p className="text-text-muted font-body text-[13px] text-center py-16">
          Yükleniyor...
        </p>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted font-body text-[13px] mb-6">
            Henüz favoriye eklediğiniz ürün yok.
          </p>
          <Link
            href="/urunler"
            className="inline-block py-3 px-8 bg-dark text-champagne text-[11px] tracking-[0.15em] uppercase font-body hover:bg-gold transition-colors"
          >
            Ürünleri Keşfet
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  )
}
