'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface HeroItem {
  image: string | null
  slug: string | null
}

// gap-1 = 4px (between rows and between bottom columns)
const GAP = 4

interface Dims { W: number; topH: number; botH: number }

export default function HeroGrid({ items, singleMode }: { items: HeroItem[]; singleMode: boolean }) {
  const topRef = useRef<HTMLDivElement>(null)
  const botRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<Dims | null>(null)

  useEffect(() => {
    function measure() {
      const top = topRef.current
      const bot = botRef.current
      if (!top || !bot) return
      const W = top.offsetWidth
      const topH = top.offsetHeight
      const botH = bot.offsetHeight
      if (W > 0 && topH > 0 && botH > 0) setDims({ W, topH, botH })
    }

    measure()

    const obs = new ResizeObserver(measure)
    if (topRef.current) obs.observe(topRef.current)
    if (botRef.current) obs.observe(botRef.current)
    return () => obs.disconnect()
  }, [])

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

  // ── Single mode — puzzle background-image split ───────────────────────────
  //
  // Composite canvas: W × (topH + GAP + botH)
  //
  //  ┌──────────────────────────┐  ← y=0
  //  │        top slot          │  height = topH
  //  ├────────────┬─────────────┤  ← y = topH + GAP
  //  │  bot-left  │  bot-right  │  height = botH
  //  └────────────┴─────────────┘
  //  x=0         x = botSlotW + GAP
  //
  // Each slot shows its window into the composite via background-position.
  // bot-right's left edge in the composite = botSlotW + GAP = (W - GAP)/2 + GAP = W/2 + GAP/2

  const image = items[0].image
  const slug = items[0].slug

  const bgStyle = (posX: number, posY: number): React.CSSProperties => {
    if (!image || !dims) return {}
    const { W, topH, botH } = dims
    const totalH = topH + GAP + botH
    return {
      backgroundImage: `url(${JSON.stringify(image)})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${Math.round(W)}px ${Math.round(totalH)}px`,
      backgroundPosition: `${Math.round(posX)}px ${Math.round(posY)}px`,
    }
  }

  const botY = dims ? -(dims.topH + GAP) : 0
  // Right slot's left edge within composite: (W - GAP)/2 + GAP = W/2 + GAP/2
  const botRightX = dims ? -(Math.round((dims.W - GAP) / 2) + GAP) : 0

  return (
    <div className="flex flex-col gap-1 order-1 lg:order-2">
      {/* Top slot */}
      <div
        ref={topRef}
        className="aspect-[2/1] relative overflow-hidden bg-champagne-dark"
        style={bgStyle(0, 0)}
      >
        {!image && (
          <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
          </div>
        )}
        {image && slug && (
          <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" />
        )}
      </div>

      {/* Bottom row */}
      <div ref={botRef} className="flex gap-1">
        <div
          className="flex-1 aspect-[2/1] relative overflow-hidden bg-champagne-dark"
          style={bgStyle(0, botY)}
        >
          {!image && (
            <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 1</span>
            </div>
          )}
          {image && slug && (
            <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" />
          )}
        </div>

        <div
          className="flex-1 aspect-[2/1] relative overflow-hidden bg-champagne-dark"
          style={bgStyle(botRightX, botY)}
        >
          {!image && (
            <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 2</span>
            </div>
          )}
          {image && slug && (
            <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" />
          )}
        </div>
      </div>
    </div>
  )
}
