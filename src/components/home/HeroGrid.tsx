import Image from 'next/image'
import Link from 'next/link'

export interface HeroItem {
  image: string | null
  slug: string | null
}

/** Returns a valid slug string, or null if the value is missing/garbage. */
function validSlug(slug: string | null): string | null {
  if (!slug || slug === 'null' || slug === 'undefined') return null
  return slug
}

/** Renders the image wrapped in a Link when slug is valid, otherwise just the image. */
function SlotImage({
  image,
  slug,
  sizes,
  alt,
}: {
  image: string
  slug: string | null
  sizes: string
  alt: string
}) {
  const href = validSlug(slug)
  if (href) {
    return (
      <Link href={`/urun/${href}`} className="block absolute inset-0">
        <Image src={image} alt={alt} fill className="object-cover" sizes={sizes} priority />
      </Link>
    )
  }
  return <Image src={image} alt={alt} fill className="object-cover" sizes={sizes} priority />
}

export default function HeroGrid({ items, singleMode }: { items: HeroItem[]; singleMode: boolean }) {

  // ── Normal mode ───────────────────────────────────────────────────────────
  if (!singleMode) {
    console.log('[HeroGrid] top slug:', items[0]?.slug, '| validSlug:', validSlug(items[0]?.slug ?? null))
    return (
      <div className="grid grid-rows-2 grid-cols-2 gap-1 order-1 lg:order-2 min-h-[400px] lg:min-h-0">
        {/* Top — hero_top */}
        <div className="col-span-2 bg-champagne-dark relative overflow-hidden">
          {items[0].image ? (
            <SlotImage image={items[0].image} slug={items[0].slug} sizes="(max-width: 1024px) 100vw, 50vw" alt="Koleksiyon" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[11px] font-body tracking-wider uppercase">Koleksiyon Görseli</span>
            </div>
          )}
        </div>
        {/* Bottom-left — hero_bottom_left */}
        <div className="bg-champagne-dark relative overflow-hidden">
          {items[1].image ? (
            <SlotImage image={items[1].image} slug={items[1].slug} sizes="(max-width: 1024px) 50vw, 25vw" alt="Ürün" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-champagne-mid/20 to-champagne-dark flex items-center justify-center">
              <span className="text-text-muted/40 text-[10px] font-body tracking-wider uppercase">Ürün 1</span>
            </div>
          )}
        </div>
        {/* Bottom-right — hero_bottom_right */}
        <div className="bg-champagne-dark relative overflow-hidden">
          {items[2].image ? (
            <SlotImage image={items[2].image} slug={items[2].slug} sizes="(max-width: 1024px) 50vw, 25vw" alt="Ürün" />
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
  const slug = validSlug(items[0].slug)

  const base: React.CSSProperties = image
    ? { backgroundImage: `url(${JSON.stringify(image)})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }
    : {}

  const SlotLink = () =>
    image && slug ? <Link href={`/urun/${slug}`} className="absolute inset-0" aria-label="Ürüne git" /> : null

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
