'use client'

import { useRef, useState, useCallback } from 'react'
import ProductCard from '@/components/store/ProductCard'
import type { Product } from '@/types'

const CARD_W = 192
const CARD_GAP = 16
const TRANSITION = 'transform 300ms ease-out'

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const [offset, setOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartTime = useRef<number | null>(null)

  const step = CARD_W + CARD_GAP
  const total = step * products.length

  const navigate = useCallback((dir: 1 | -1, cards = 1) => {
    setOffset((prev) => {
      let next = prev + dir * step * cards
      // clamp within [0, total)
      next = ((next % total) + total) % total
      return next
    })
  }, [step, total])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartTime.current = Date.now()
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartTime.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    const elapsed = Date.now() - touchStartTime.current
    touchStartX.current = null
    touchStartTime.current = null

    if (Math.abs(delta) < 20) return // ignore micro-swipes

    const velocity = Math.abs(delta) / elapsed // px/ms
    const cards = velocity > 0.5 ? 3 : 1
    navigate(delta > 0 ? 1 : -1, cards)
  }

  const looped = [...products, ...products]

  return (
    <div
      className="relative group"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden">
        <div
          className="flex gap-4"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: TRANSITION,
            willChange: 'transform',
          }}
        >
          {looped.map((product, i) => (
            <div key={`${product.id}-${i}`} style={{ width: CARD_W, flexShrink: 0 }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Left arrow */}
      <button
        onClick={() => navigate(-1)}
        aria-label="Önceki"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10
          w-10 h-10 bg-white/90 border border-champagne-mid shadow-sm
          flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          hover:bg-gold hover:text-white hover:border-gold"
      >
        <span className="text-[14px] font-body">‹</span>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => navigate(1)}
        aria-label="Sonraki"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10
          w-10 h-10 bg-white/90 border border-champagne-mid shadow-sm
          flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          hover:bg-gold hover:text-white hover:border-gold"
      >
        <span className="text-[14px] font-body">›</span>
      </button>
    </div>
  )
}
