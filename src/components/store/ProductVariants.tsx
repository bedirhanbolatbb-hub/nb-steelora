import Image from 'next/image'
import Link from 'next/link'
import { IMAGE_QUALITY, gorselBoyutu, isRemoteMedia } from '@/lib/images'
import type { VariantMember } from '@/lib/catalog/variantGroup'

type Props = {
  members: VariantMember[]
  currentId: string
  /** 'chips' beden gibi etiketli gruplar için, 'thumbnails' görselle ayrışanlar için. */
  variant: 'chips' | 'thumbnails'
  /** Yüzükte "Ölçü rehberi" bağlantısı basılır. */
  yuzuk?: boolean
}

/**
 * Aynı gruptaki diğer ürünler. Seçim, üyenin kendi sayfasına normal bir
 * bağlantıyla gider: URL değişir, geçmişe eklenir, her ürünün kendi sayfası
 * erişilir kalır. Sepete ekleme her zaman görüntülenen tekil ürünün id'si ile.
 *
 * Faz 11A: HER İKİ tür de satın alma kolonunda, FİYATIN ÜSTÜNDE durur.
 * Görselle ayrışan gruplar (harf kolyeleri, renk seçenekleri) eskiden
 * galerinin altındaydı; müşteri diğer seçeneği göremeden fiyata ve sepete
 * ekle düğmesine bakıyordu. Seçim de fiyat da aynı sütunda olmalı.
 *
 * 24 Kas 2026 tasarım denetimi (yüzük): beden seçince sayfa BAŞA atıyordu —
 * her beden ayrı adres, bağlantı da sayfayı en üste kaydırıyordu; beden satırı
 * katlamada kesiliyor, müşteri seçtiğini göremiyordu. `scroll={false}` ile
 * konum korunur. Düğmeler 48 px, seçili beden dolu mürekkep; hangi bedenin
 * sepete gideceği etikette yazıyla da söylenir. Numaraların mm karşılığı
 * BASILMAZ: elimizde tedarikçiden doğrulanmış ölçü yok, uydurulmaz.
 */
export default function ProductVariants({ members, currentId, variant, yuzuk = false }: Props) {
  if (members.length < 2) return null
  const secili = members.find((m) => m.id === currentId)

  return (
    <div
      // Yapışkan çubuk bedenli üründe ilk basışta buraya kaydırıp vurguluyor.
      id={variant === 'chips' ? 'beden-secimi' : undefined}
      className={variant === 'chips' ? 'mt-5 scroll-mt-28' : 'mt-5'}
    >
      {variant === 'chips' ? (
        <div className="mb-2.5 flex items-baseline justify-between gap-3 font-body">
          <p className="text-[13px] text-ink-soft">
            {yuzuk ? 'Yüzük ölçüsü' : 'Beden'}
            {secili?.variant_label && (
              <>
                : <span className="font-medium text-ink">{secili.variant_label}</span>
              </>
            )}
          </p>
          {yuzuk && (
            <Link
              prefetch={false}
              href="/blog/yuzuk-olcusu-nasil-belirlenir"
              className="-my-3 py-3 text-[13px] text-accent-deep underline underline-offset-4 transition-colors hover:text-ink"
            >
              Ölçü rehberi
            </Link>
          )}
        </div>
      ) : (
        <p className="mb-2.5 font-body text-[13px] text-ink-soft">Diğer seçenekler ({members.length})</p>
      )}

      {variant === 'chips' ? (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const isCurrent = member.id === currentId
            const outOfStock = member.trendyol_stock === 0
            return (
              <Link
                prefetch={false}
                key={member.id}
                href={`/urun/${member.slug}`}
                // Konum korunur: beden değişince sayfa başa atmaz.
                scroll={false}
                aria-current={isCurrent ? 'page' : undefined}
                className={`inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[4px] border px-3 font-body text-[15px] transition-colors ${
                  isCurrent
                    ? 'border-ink bg-ink font-medium text-white'
                    : 'border-line-strong text-ink hover:border-ink'
                } ${outOfStock ? 'opacity-40' : ''}`}
              >
                <span className={outOfStock ? 'line-through' : undefined}>{member.variant_label}</span>
                {outOfStock && <span className="sr-only"> (tükendi)</span>}
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
                prefetch={false}
                key={member.id}
                href={`/urun/${member.slug}`}
                scroll={false}
                aria-current={isCurrent ? 'page' : undefined}
                title={member.display_title}
                className={`relative w-14 h-[68px] shrink-0 bg-surface-muted overflow-hidden rounded-[3px] border-2 transition-colors ${
                  isCurrent ? 'border-ink' : 'border-transparent hover:border-line-strong'
                }`}
              >
                {image && (
                  <Image
                    src={gorselBoyutu(image, 128)}
                    unoptimized={isRemoteMedia(image)}
                    alt={member.display_title}
                    fill
                    className={`object-cover ${outOfStock ? 'opacity-40' : ''}`}
                    sizes="56px"
                    quality={IMAGE_QUALITY}
                  />
                )}
                {outOfStock && (
                  <span className="absolute inset-x-0 bottom-0 bg-ink/70 text-bg text-[10px] text-center py-0.5 font-body">
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
