import Image from 'next/image'
import Link from 'next/link'

export interface HeroItem {
  image: string | null
  slug: string | null
}

export default function HeroGrid({ items, singleMode }: { items: HeroItem[]; singleMode: boolean }) {

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

  // ── Single mode — one image, overlay link regions ────────────────────────
  const image = items[0].image
  const slug = items[0].slug
  const href = slug ? `/urunler/${slug}` : null

  return (
    <div className="relative w-full aspect-[4/3] order-1 lg:order-2 overflow-hidden bg-champagne-dark">
      {image ? (
        <Image src={image} alt="Koleksiyon" fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 50vw" priority />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
          <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
        </div>
      )}
      {href && (
        <>
          <Link href={href} className="absolute top-0 left-0 w-full h-[66.67%]" aria-label="Ürüne git" />
          <Link href={href} className="absolute bottom-0 left-0 w-1/2 h-[33.33%]" aria-label="Ürüne git" />
          <Link href={href} className="absolute bottom-0 right-0 w-1/2 h-[33.33%]" aria-label="Ürüne git" />
        </>
      )}
    </div>
  )
}
