'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import WishlistButton from './WishlistButton'
import ProductImage from './ProductImage'
import { useCart } from '@/hooks/useCart'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  priority?: boolean
  /** Aynı gruptaki diğer üye sayısı — "+N seçenek" rozeti olarak basılır. */
  optionCount?: number
}

const ADDED_FEEDBACK_MS = 1200

export default function ProductCard({ product, priority = false, optionCount = 0 }: ProductCardProps) {
  const images = (product.display_images as string[] | null) ?? []
  const primaryImage = images[0] ?? (product as any).trendyol_images?.[0] ?? null
  const hoverImage = images[1] ?? null

  const addItem = useCart((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const outOfStock = product.trendyol_stock === 0

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (outOfStock || added) return
    // Sepet çekmecesi bilerek açılmaz; geri bildirim kart üzerinde ve
    // header'daki sayaç darbesiyle verilir.
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
  }

  return (
    <Link href={`/urun/${product.slug}`} className="group block">
      <div
        className={`relative aspect-square overflow-hidden bg-surface border border-line rounded-[4px] ${
          // İkinci görsel varsa hover'da o gösterilir; ışık süpürmesi yalnız tek
          // görselli kartlarda çalışır ki iki efekt çakışmasın.
          hoverImage ? '' : 'sheen'
        }`}
      >
        <div className="absolute inset-0 p-3">
          <div className="relative h-full w-full">
            <ProductImage
              src={primaryImage}
              alt={product.display_title}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className={`object-contain transition-all duration-500 ${
                hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.04]'
              }`}
            />

            {/* İkinci görsel varsa hover'da yumuşak geçiş */}
            {hoverImage && (
              <Image
                src={hoverImage}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </div>
        </div>

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3">
            <Badge variant={product.badge} />
          </div>
        )}

        {/* Wishlist */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-surface/90 rounded-full hover:bg-surface transition-colors">
            <WishlistButton productId={product.id} />
          </div>
        </div>

        {/* Grup çipi — aynı başlık/kategori/fiyat/gender kümesindeki diğer üyeler */}
        {optionCount > 0 && (
          <span className="absolute bottom-2 right-2 bg-surface/95 border border-accent/60 text-ink text-[9px] px-2 py-0.5 font-body tracking-[0.08em] rounded-[2px]">
            +{optionCount} seçenek
          </span>
        )}

        {/* Stok durumu */}
        {outOfStock && (
          <span className="absolute bottom-2 left-2 bg-ink text-bg text-[9px] px-2 py-0.5 font-body tracking-[0.08em] rounded-[2px]">
            Tükendi
          </span>
        )}

        {/* Hızlı ekleme — mobilde görünür, masaüstünde hover */}
        <button
          onClick={handleQuickAdd}
          disabled={outOfStock}
          className="absolute bottom-0 left-0 right-0 py-3 bg-ink text-bg text-[10px] tracking-[0.15em] uppercase font-body font-medium text-center
            opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200
            disabled:bg-line disabled:text-muted disabled:cursor-not-allowed"
        >
          {outOfStock ? 'Tükendi' : added ? 'Eklendi ✓' : 'Sepete Ekle'}
        </button>
      </div>

      <div className="pt-3 pb-1">
        <h3 className="font-body font-medium text-[13px] leading-snug text-ink clamp-2 min-h-[2.6em] group-hover:text-accent-deep transition-colors">
          {product.display_title}
        </h3>

        {(product as any).avg_rating > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-accent text-[11px] leading-none">★</span>
            <span className="text-[11px] font-body text-muted">
              {Number((product as any).avg_rating).toFixed(1)} ({(product as any).review_count})
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-2">
          <span className="price text-[15px] text-ink">
            {formatPrice((product as any).custom_price ?? product.display_price)}
          </span>
          {((product as any).custom_price && (product as any).custom_price < product.display_price) && (
            <span className="price text-[12px] text-muted line-through font-normal">
              {formatPrice(product.display_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
