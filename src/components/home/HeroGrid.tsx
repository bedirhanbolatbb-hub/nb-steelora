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

  // ── Single mode — cover crop, positional focus per slot ─────────────────
  const image = items[0].image
  const slug = items[0].slug

  const base: React.CSSProperties = image
    ? { backgroundImage: `url(${JSON.stringify(image)})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }
    : {}

  const SlotLink = () =>
    image && slug ? <Link href={`/urunler/${slug}`} className="absolute inset-0" aria-label="Ürüne git" /> : null

  return (
    <div className="flex flex-col gap-1 order-1 lg:order-2">
      {/* Top: full width, 2:1 */}
      <div
        className="w-full aspect-[2/1] relative overflow-hidden bg-champagne-dark"
        style={{ ...base, backgroundPosition: 'center center' }}
      >
        {!image && (
          <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
            <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
          </div>
        )}
        <SlotLink />
      </div>
      {/* Bottom: two equal squares */}
      <div className="flex gap-1">
        <div
          className="flex-1 aspect-[1/1] relative overflow-hidden bg-champagne-dark"
          style={{ ...base, backgroundPosition: 'left center' }}
        >
          {!image && (
            <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 1</span>
            </div>
          )}
          <SlotLink />
        </div>
        <div
          className="flex-1 aspect-[1/1] relative overflow-hidden bg-champagne-dark"
          style={{ ...base, backgroundPosition: 'right center' }}
        >
          {!image && (
            <div className="absolute inset-0 bg-gradient-to-bl from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 2</span>
            </div>
          )}
          <SlotLink />
        </div>
      </div>
    </div>
  )
}
