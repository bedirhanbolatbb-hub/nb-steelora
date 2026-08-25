'use client'

import { useWishlist } from '@/hooks/useWishlist'

/**
 * `kutu` görünümü (Faz 11A): ürün sayfasında kalp, Sepete Ekle'nin YANINDA
 * durur ve onunla aynı yüksekliktedir. Kartlardaki serbest ikon görünümü
 * (`ikon`) olduğu gibi kalır.
 */
export default function WishlistButton({
  productId,
  gorunum = 'ikon',
}: {
  productId: string
  gorunum?: 'ikon' | 'kutu'
}) {
  const { toggleItem, isInWishlist } = useWishlist()
  const inWishlist = isInWishlist(productId)
  const kutu = gorunum === 'kutu'

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleItem(productId)
      }}
      className={
        kutu
          ? 'shrink-0 flex items-center justify-center w-[58px] py-[18px] border border-line rounded-[4px] transition-colors hover:border-accent-line'
          : 'p-2 transition-transform hover:scale-110'
      }
      title={inWishlist ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-label={inWishlist ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-pressed={inWishlist}
    >
      <svg
        className={`w-5 h-5 transition-colors ${
          inWishlist
            ? 'fill-accent-line stroke-accent-line'
            : 'fill-none stroke-text-muted hover:stroke-accent-line'
        }`}
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  )
}
