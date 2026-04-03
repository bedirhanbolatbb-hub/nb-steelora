'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ProductCard from '@/components/store/ProductCard'
import type { Product } from '@/types'

const CARD_W = 192
const CARD_GAP = 16
const AUTOPLAY_MS = 3500
const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

export default function FeaturedCarousel({ products }: { products: Product[] }) {
  const step = CARD_W + CARD_GAP
  const total = step * products.length

  // offset: the settled position after each snap
  const [offset, setOffset] = useState(0)
  // liveTranslate: what the track currently shows (includes finger-drag delta)
  const [liveTranslate, setLiveTranslate] = useState(0)
  const [transition, setTransition] = useState(`transform 300ms ${EASING}`)

  const offsetRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartTime = useRef<number | null>(null)
  const isDragging = useRef(false)

  // keep offsetRef in sync
  useEffect(() => { offsetRef.current = offset }, [offset])
  // keep liveTranslate in sync with offset when not dragging
  useEffect(() => { if (!isDragging.current) setLiveTranslate(offset) }, [offset])

  const snapTo = useCallback((next: number, durationMs = 300) => {
    const clamped = ((next % total) + total) % total
    setTransition(`transform ${durationMs}ms ${EASING}`)
    setOffset(clamped)
    setLiveTranslate(clamped)
  }, [total])

  // ── Autoplay ──────────────────────────────────────────────────────────────
  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      snapTo(offsetRef.current + step)
    }, AUTOPLAY_MS)
  }, [step, snapTo])

  useEffect(() => {
    if (products.length < 2) return
    startAutoplay()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [products.length, startAutoplay])

  // ── Arrow navigation ──────────────────────────────────────────────────────
  const navigate = useCallback((dir: 1 | -1) => {
    snapTo(offsetRef.current + dir * step)
    startAutoplay() // reset autoplay timer on interaction
  }, [step, snapTo, startAutoplay])

  // ── Touch / swipe ─────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartTime.current = Date.now()
    isDragging.current = true
    // disable transition so track follows finger instantly
    setTransition('none')
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    setLiveTranslate(offsetRef.current - delta) // note: we subtract because translateX is negative
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartTime.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const elapsed = Date.now() - touchStartTime.current
    touchStartX.current = null
    touchStartTime.current = null
    isDragging.current = false

    const velocity = Math.abs(deltaX) / elapsed // px/ms
    const shouldAdvance = velocity > 0.3 || Math.abs(deltaX) > 50

    if (shouldAdvance) {
      const dir = deltaX < 0 ? 1 : -1
      const durationMs = velocity > 0.5 ? 150 : 300
      snapTo(offsetRef.current + dir * step, durationMs)
    } else {
      // snap back to current offset
      snapTo(offsetRef.current, 200)
    }

    startAutoplay()
  }

  const looped = [...products, ...products]

  return (
    <div
      className="relative group"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden">
        <div
          className="flex gap-4"
          style={{
            transform: `translateX(-${liveTranslate}px)`,
            transition,
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
