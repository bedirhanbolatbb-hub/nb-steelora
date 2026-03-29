'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import WishlistButton from './WishlistButton'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  priority?: boolean
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const imageUrl = product.display_images?.[0] || '/placeholder-product.jpg'

  return (
    <Link href={`/urun/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-champagne-dark">
        <Image
          src={imageUrl}
          alt={product.display_title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
        />

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 left-3">
            <Badge variant={product.badge} />
          </div>
        )}

        {/* Wishlist */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-white/80 rounded-full hover:bg-white transition-colors">
            <WishlistButton productId={product.id} />
          </div>
        </div>

        {/* Gold border on hover */}
        <div className="absolute inset-0 border border-transparent group-hover:border-gold/30 transition-colors duration-300 pointer-events-none" />
      </div>

      <div className="pt-3 pb-1">
        <h3 className="font-heading text-[15px] text-text-primary leading-tight group-hover:text-gold transition-colors">
          {product.display_title}
        </h3>
        {product.trendyol_category && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-body mt-1">
            {product.trendyol_category}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[14px] font-body text-gold font-medium">
            {formatPrice(product.display_price)}
          </span>
          {product.override_price && product.trendyol_price > product.override_price && (
            <span className="text-[12px] font-body text-text-muted line-through">
              {formatPrice(product.trendyol_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
