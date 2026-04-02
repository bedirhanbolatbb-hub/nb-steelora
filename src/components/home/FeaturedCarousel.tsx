'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ProductCard from '@/components/store/ProductCard'
import type { Product } from '@/types'

const CARD_W = 192
const CARD_GAP = 16
const AUTOPLAY_MS = 3000

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [paused, setPaused] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { pausedRef.current = paused }, [paused])

  // Autoplay — restarts whenever resetKey changes
  useEffect(() => {
    if (products.length < 2) return
    const step = CARD_W + CARD_GAP
    const total = step * products.length

    const id = setInterval(() => {
      if (pausedRef.current) return
      let next = offsetRef.current + step
      if (next >= total) next = 0
      setOffset(next)
    }, AUTOPLAY_MS)

    return () => clearInterval(id)
  }, [products.length, resetKey])

  const step = CARD_W + CARD_GAP
  const total = step * products.length

  const navigate = useCallback((dir: 1 | -1) => {
    setOffset((prev) => {
      let next = prev + dir * step
      if (next < 0) next = total - step
      if (next >= total) next = 0
      return next
    })
    setResetKey((k) => k + 1)
  }, [step, total])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) navigate(delta > 0 ? 1 : -1)
    touchStartX.current = null
  }

  const looped = [...products, ...products]

  return (
    <div
      className="relative group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex gap-4"
          style={{
            transform: `translateX(-${offset}px)`,
            transition: `transform ${AUTOPLAY_MS * 0.3}ms ease-in-out`,
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
