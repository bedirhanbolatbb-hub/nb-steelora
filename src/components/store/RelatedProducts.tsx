'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCardV2 from './ProductCardV2'
import { markaKategoriYolu } from '@/lib/catalog/categories'

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
      <div className="mt-12 border-t border-line pt-10 lg:mt-16 lg:pt-14">
        <h2 className="mb-5 font-heading text-[24px] font-medium text-ink lg:mb-8 lg:text-[32px]">
          Bunları da beğenebilirsiniz
        </h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-4 lg:gap-x-6">
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
  const kategoriYolu = markaKategoriYolu(category)

  return (
    <div className="mt-12 border-t border-line pt-10 lg:mt-16 lg:pt-14">
      <div className="mb-5 flex items-end justify-between gap-4 lg:mb-8">
        <h2 className="font-heading text-[24px] font-medium text-ink lg:text-[32px]">
          Bunları da beğenebilirsiniz
        </h2>
        {/* 24 Kas 2026: bağlantı ham pazaryeri kategorisiyle süzüyor, liste
            sayfasında "Bijuteri Bileklik" gibi tedarikçi adını çip olarak
            basıyordu; telefonda da hiç görünmüyordu. Artık menüdeki kategori
            sayfasına gider. */}
        {kategoriYolu && (
          <Link
            prefetch={false}
            href={kategoriYolu.href}
            className="-my-2.5 flex min-h-[44px] shrink-0 items-center whitespace-nowrap font-body text-[14px] text-ink underline decoration-accent underline-offset-4 transition-colors hover:text-accent-deep"
          >
            Tüm {kategoriYolu.title.toLocaleLowerCase('tr-TR')} modelleri
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 md:grid-cols-4 lg:gap-x-6">
        {products.map((product) => (
          <ProductCardV2 key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
