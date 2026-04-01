'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface HeroItem {
  image: string | null
  slug: string | null
}

export default function HeroGrid({ items, singleMode }: { items: HeroItem[]; singleMode: boolean }) {
  const topRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ W: number; H: number } | null>(null)

  useEffect(() => {
    const el = topRef.current
    if (!el) return
    // Initial synchronous read — covers first paint after hydration
    const W = el.offsetWidth
    const H = el.offsetHeight
    if (W > 0 && H > 0) setDims({ W, H })

    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDims({ W: width, H: height })
    })
    obs.observe(el)
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
  // Layout:
  //   top    → width=W, height=H       (aspect-[2/1])
  //   bot-L  → width=W/2, height=H/2  (aspect-[2/1] at half width)
  //   bot-R  → width=W/2, height=H/2
  //
  // One image stretched to W×1.5H covers all three slots:
  //   top    → bgPos 0      0
  //   bot-L  → bgPos 0     -H
  //   bot-R  → bgPos -(W/2) -H

  const image = items[0].image
  const slug = items[0].slug

  const bgSize = dims ? `${Math.round(dims.W)}px ${Math.round(dims.H * 1.5)}px` : undefined

  const bgStyle = (posX: number, posY: number): React.CSSProperties =>
    image && dims
      ? {
          backgroundImage: `url(${JSON.stringify(image)})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: bgSize,
          backgroundPosition: `${posX}px ${posY}px`,
        }
      : {}

  return (
    <div className="flex flex-col gap-1 order-1 lg:order-2">
      {/* Top slot: full width, sets H via aspect-[2/1] */}
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

      {/* Bottom row: each child is flex-1 aspect-[2/1] → width=W/2, height=W/4=H/2 */}
      <div className="flex gap-1">
        <div
          className="flex-1 aspect-[2/1] relative overflow-hidden bg-champagne-dark"
          style={bgStyle(0, dims ? -Math.round(dims.H) : 0)}
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
          style={bgStyle(dims ? -Math.round(dims.W / 2) : 0, dims ? -Math.round(dims.H) : 0)}
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
