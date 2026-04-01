'use client'

import { useEffect, useRef, useState } from 'react'
import ProductCard from '@/components/store/ProductCard'
import type { Product } from '@/types'

const CARD_GAP = 24     // gap-6 = 24px
const AUTOPLAY_MS = 3000

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [cardW, setCardW] = useState(0)
  const [offset, setOffset] = useState(0)
  const [paused, setPaused] = useState(false)
  const offsetRef = useRef(0)
  const pausedRef = useRef(false)

  // Measure one card width from the first child
  useEffect(() => {
    const measure = () => {
      const first = trackRef.current?.children[0] as HTMLElement | undefined
      if (first) setCardW(first.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [products.length])

  // Keep refs in sync so the interval closure always sees latest values
  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { pausedRef.current = paused }, [paused])

  // Autoplay
  useEffect(() => {
    if (!cardW || products.length < 2) return
    const step = cardW + CARD_GAP
    const total = step * products.length   // one full loop length

    const id = setInterval(() => {
      if (pausedRef.current) return
      let next = offsetRef.current + step
      // Seamless reset: when we've scrolled one full loop, jump back to 0
      if (next >= total) next = 0
      setOffset(next)
    }, AUTOPLAY_MS)

    return () => clearInterval(id)
  }, [cardW, products.length])

  // Duplicate items for seamless looping (2 copies is enough)
  const looped = [...products, ...products]

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-6"
        style={{
          transform: `translateX(-${offset}px)`,
          transition: paused ? 'none' : `transform ${AUTOPLAY_MS * 0.3}ms ease-in-out`,
          willChange: 'transform',
        }}
      >
        {looped.map((product, i) => (
          <div key={`${product.id}-${i}`} className="w-[calc(25%-18px)] shrink-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  )
}
