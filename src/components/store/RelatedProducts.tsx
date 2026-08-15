'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCardV2 from './ProductCardV2'

interface RelatedProductsProps {
  productId: string
  category: string
}

export default function RelatedProducts({ productId, category }: RelatedProductsProps) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(
      `/api/products/related?id=${productId}&category=${encodeURIComponent(category)}&limit=4`
    )
      .then((r) => r.json())
      .then((data) => {
        setProducts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productId, category])

  if (loading)
    return (
      <div className="mt-16 pt-16 border-t border-line">
        <h2 className="font-heading text-[26px] lg:text-[32px] font-medium text-ink mb-8">
          Bunları da Beğenebilirsiniz
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-line aspect-[4/5] mb-3 rounded-[4px]" />
              <div className="h-4 bg-line rounded mb-2" />
              <div className="h-3 bg-line rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )

  if (products.length === 0) return null

  return (
    <div className="mt-16 pt-16 border-t border-line">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="eyebrow">Benzer parçalar</p>
          <h2 className="font-heading text-[26px] lg:text-[32px] font-medium text-ink mt-1.5">
            Bunları da Beğenebilirsiniz
          </h2>
        </div>
        <Link
          href={`/urunler?kategori=${encodeURIComponent(category)}`}
          className="text-[11px] uppercase tracking-[0.15em] font-body text-muted hover:text-accent transition-colors hidden sm:block"
        >
          Tümünü Gör →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {products.map((product) => (
          <ProductCardV2 key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
