'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface HeroItem {
  image: string | null
  slug: string | null
}

interface Dims { W: number; H: number; topH: number }

export default function HeroGrid({ items, singleMode }: { items: HeroItem[]; singleMode: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<Dims | null>(null)

  useEffect(() => {
    if (!singleMode) return
    function measure() {
      const wrapper = wrapperRef.current
      const top = topRef.current
      if (!wrapper || !top) return
      const W = wrapper.offsetWidth
      const H = wrapper.offsetHeight
      const topH = top.offsetHeight
      if (W > 0 && H > 0 && topH > 0) setDims({ W, H, topH })
    }
    measure()
    const obs = new ResizeObserver(measure)
    if (wrapperRef.current) obs.observe(wrapperRef.current)
    return () => obs.disconnect()
  }, [singleMode])

  // ── Normal mode ───────────────────────────────────────────────────────────
  if (!singleMode) {
    return (
      <div className="grid grid-rows-2 grid-cols-2 gap-1 order-1 lg:order-2 min-h-[400px] lg:min-h-0">
        <div className="col-span-2 bg-champagne-dark relative overflow-hidden">
          {items[0].image ? (
            items[0].slug ? (
              <Link href={`/urunler/${items[0].slug}`} className="block absolute inset-0">
                <Image src={items[0].image} alt="Koleksiyon" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
              </Link>
            ) : (
              <Image src={items[0].image} alt="Koleksiyon" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
            </div>
          )}
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          {items[1].image ? (
            items[1].slug ? (
              <Link href={`/urunler/${items[1].slug}`} className="block absolute inset-0">
                <Image src={items[1].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
              </Link>
            ) : (
              <Image src={items[1].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 1</span>
            </div>
          )}
        </div>
        <div className="bg-champagne-dark relative overflow-hidden">
          {items[2].image ? (
            items[2].slug ? (
              <Link href={`/urunler/${items[2].slug}`} className="block absolute inset-0">
                <Image src={items[2].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
              </Link>
            ) : (
              <Image src={items[2].image} alt="Ürün" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" priority />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 2</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Single mode — same grid layout, background-image puzzle ──────────────
  const image = items[0].image
  const slug = items[0].slug

  const bgSize = dims ? `${dims.W}px ${dims.H}px` : undefined

  const slotStyle = (posX: number, posY: number): React.CSSProperties =>
    image && bgSize
      ? {
          backgroundImage: `url(${JSON.stringify(image)})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: bgSize,
          backgroundPosition: `${posX}px ${posY}px`,
        }
      : {}

  const topY = 0
  const botY = dims ? -dims.topH : 0
  const halfW = dims ? -(dims.W / 2) : 0

  return (
    <div ref={wrapperRef} className="grid grid-rows-2 grid-cols-2 gap-1 order-1 lg:order-2 min-h-[400px] lg:min-h-0">
      <div ref={topRef} className="col-span-2 bg-champagne-dark relative overflow-hidden" style={slotStyle(0, topY)}>
        {!image && (
          <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
          </div>
        )}
        {image && slug && <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" />}
      </div>
      <div className="bg-champagne-dark relative overflow-hidden" style={slotStyle(0, botY)}>
        {!image && (
          <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 1</span>
          </div>
        )}
        {image && slug && <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" />}
      </div>
      <div className="bg-champagne-dark relative overflow-hidden" style={slotStyle(halfW, botY)}>
        {!image && (
          <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 2</span>
          </div>
        )}
        {image && slug && <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" />}
      </div>
    </div>
  )
}
