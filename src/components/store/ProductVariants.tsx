import Image from 'next/image'
import Link from 'next/link'
import { IMAGE_QUALITY, isMediaUrl } from '@/lib/images'
import type { VariantMember } from '@/lib/catalog/variantGroup'

type Props = {
  members: VariantMember[]
  currentId: string
  /** 'chips' beden gibi etiketli gruplar için, 'thumbnails' görselle ayrışanlar için. */
  variant: 'chips' | 'thumbnails'
}

/**
 * Aynı gruptaki diğer ürünler. Seçim, üyenin kendi sayfasına normal bir
 * bağlantıyla gider: URL değişir, geçmişe eklenir, her ürünün kendi sayfası
 * erişilir kalır. Sepete ekleme her zaman görüntülenen tekil ürünün id'si ile.
 *
 * Etiketli gruplar (yüzük bedenleri) satın alma kolonunda, fiyatın üstünde
 * durur — beden seçimi satın alma kararının parçasıdır. Görselle ayrışan
 * gruplar (harf kolyeleri) galerinin altında kalır.
 */
export default function ProductVariants({ members, currentId, variant }: Props) {
  if (members.length < 2) return null

  return (
    <div
      // Yapışkan çubuk bedenli üründe ilk basışta buraya kaydırıp vurguluyor.
      id={variant === 'chips' ? 'beden-secimi' : undefined}
      className={variant === 'chips' ? 'mt-5 scroll-mt-28' : 'mt-6'}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] font-body text-muted mb-3">
        {variant === 'chips' ? `Beden seçin (${members.length})` : `Diğer seçenekler (${members.length})`}
      </p>

      {variant === 'chips' ? (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const isCurrent = member.id === currentId
            const outOfStock = member.trendyol_stock === 0
            return (
              <Link
                key={member.id}
                href={`/urun/${member.slug}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-[44px] text-center px-3 py-2 text-[12px] font-body border rounded-[4px] transition-colors ${
                  isCurrent
                    ? 'border-ink text-ink font-medium'
                    : 'border-line text-ink-soft hover:border-accent hover:text-accent-deep'
                } ${outOfStock ? 'opacity-40' : ''}`}
              >
                {member.variant_label}
                {outOfStock && <span className="ml-1 text-[10px]">· tükendi</span>}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {members.map((member) => {
            const isCurrent = member.id === currentId
            const outOfStock = member.trendyol_stock === 0
            const image = member.display_images?.[0]
            return (
              <Link
                key={member.id}
                href={`/urun/${member.slug}`}
                aria-current={isCurrent ? 'page' : undefined}
                title={member.display_title}
                className={`relative w-16 h-20 shrink-0 bg-surface-muted overflow-hidden border-2 transition-colors ${
                  isCurrent ? 'border-accent' : 'border-transparent hover:border-line'
                }`}
              >
                {image && (
                  <Image
                    src={image}
                    unoptimized={isMediaUrl(image)}
                    alt={member.display_title}
                    fill
                    className={`object-cover ${outOfStock ? 'opacity-40' : ''}`}
                    sizes="64px"
                    quality={IMAGE_QUALITY}
                  />
                )}
                {outOfStock && (
                  <span className="absolute inset-x-0 bottom-0 bg-ink/70 text-bg text-[8px] text-center py-0.5 font-body">
                    Tükendi
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
