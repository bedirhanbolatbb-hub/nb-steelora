'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { resolveBadge } from '@/lib/catalog/badge'
import ProductImage from './ProductImage'
import { IMAGE_QUALITY, isRemoteMedia } from '@/lib/images'
import { useCart } from '@/hooks/useCart'
import type { Product } from '@/types'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'

/**
 * Ürün kartı v2 (Faz 8B, "Sessiz Atölye").
 *
 * 4:5 dikey oran + object-cover: 20 örnekle yapılan kırpım testinde tüm
 * kaynaklar 2:3 dikey ve ürün merkezde — kırpım kompozisyonu bozmuyor,
 * saten zemin kadrajı dolduruyor. Kartta yıldız/puan YOK (PDP'de kalır);
 * tek rozet mevcut öncelik kuralıyla (Son 1 adet > elle rozet > Yeni).
 * Şimdilik yalnız anasayfada — liste/PDP sonraki dalgada geçer.
 */
interface ProductCardV2Props {
  product: Product
  priority?: boolean
  optionCount?: number
  /** Editorial büyük kartlarda tipografi bir kademe büyür. */
  buyuk?: boolean
}

const ADDED_FEEDBACK_MS = 1200

export default function ProductCardV2({
  product,
  priority = false,
  optionCount = 0,
  buyuk = false,
}: ProductCardV2Props) {
  const images = (product.display_images as string[] | null) ?? []
  const primaryImage = images[0] ?? (product as any).trendyol_images?.[0] ?? null
  // Kaynağında ölü (403/404) hover görseli, üzerine gelindiğinde ana görselin
  // yerine boş kutu bırakıyordu — yüklenemeyen hover görseli devre dışı kalır
  // ve kart tek görselle çalışmayı sürdürür (Faz 9B).
  const [hoverFailed, setHoverFailed] = useState(false)
  const hoverImage = hoverFailed ? null : images[1] ?? null

  const addItem = useCart((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const outOfStock = product.trendyol_stock === 0
  const badge = resolveBadge(product as any)
  // Aktif otomatik kampanya varsa kartta üstü çizili fiyat + oran rozeti
  // gösterilir; tutar yine sepette tek motordan hesaplanır (Faz 15).
  const kampanya = useVitrinIndirimi()
  const listeFiyati = Number((product as any).override_price ?? product.display_price) || 0
  const kampanyaliFiyat = kampanya
    ? Math.round(listeFiyati * (1 - kampanya.oran / 100) * 100) / 100
    : null

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (outOfStock || added) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
  }

  return (
    <Link href={`/urun/${product.slug}`} className="group block">
      <div
        className={`relative overflow-hidden bg-surface-muted rounded-[4px] ${
          // Editorial çift: masaüstünde iki büyük kart tek ekrana sığsın diye
          // 5:4 (20 örnekli kırpım testi — ürünler merkezde, kadraj kaybı yok).
          buyuk ? 'aspect-[4/5] sm:aspect-[5/4]' : 'aspect-[4/5]'
        }`}
      >
        {primaryImage && (
          <ProductImage
            src={primaryImage}
            alt={product.display_title}
            sizes={buyuk ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 340px'}
            priority={priority}
            className={`object-cover transition-all duration-700 ${
              hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.04]'
            }`}
          />
        )}

        {hoverImage && (
          <Image
            src={hoverImage}
            unoptimized={isRemoteMedia(hoverImage)}
            alt=""
            aria-hidden
            fill
            sizes={buyuk ? '50vw' : '(max-width: 640px) 50vw, 340px'}
            quality={IMAGE_QUALITY}
            className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            onError={() => setHoverFailed(true)}
          />
        )}

        {/* Tek rozet — mevcut öncelik kuralı */}
        {badge && (
          <span className="absolute top-3 left-3 bg-bg/95 text-ink text-[9px] px-2.5 py-1 font-body font-medium uppercase tracking-[0.15em] rounded-[2px]">
            {badge.label}
          </span>
        )}

        {optionCount > 0 && (
          <span className="absolute bottom-3 right-3 bg-bg/95 text-ink text-[9px] px-2 py-0.5 font-body tracking-[0.08em] rounded-[2px]">
            +{optionCount} seçenek
          </span>
        )}

        {outOfStock && (
          <span className="absolute bottom-3 left-3 bg-ink text-bg text-[9px] px-2 py-0.5 font-body tracking-[0.08em] rounded-[2px]">
            Tükendi
          </span>
        )}

        {/* Hızlı ekleme — mobilde görünür, masaüstünde hover */}
        <button
          onClick={handleQuickAdd}
          disabled={outOfStock}
          className="absolute bottom-0 left-0 right-0 py-3 bg-ink/90 text-bg text-[10px] tracking-[0.18em] uppercase font-body font-medium text-center backdrop-blur-[2px]
            opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300
            disabled:bg-line disabled:text-muted disabled:cursor-not-allowed"
        >
          {outOfStock ? 'Tükendi' : added ? 'Eklendi ✓' : 'Sepete Ekle'}
        </button>
      </div>

      <div className="pt-3.5 pb-1 text-center">
        <h3
          className={`font-body text-ink clamp-2 leading-snug transition-colors group-hover:text-accent-deep ${
            buyuk ? 'text-[15px] font-medium' : 'text-[13px] font-medium min-h-[2.6em]'
          }`}
        >
          {product.display_title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
          {kampanyaliFiyat != null ? (
            <>
              <span className={`price text-accent-deep ${buyuk ? 'text-[16px]' : 'text-[14px]'}`}>
                {formatPrice(kampanyaliFiyat)}
              </span>
              <span className="price text-[12px] font-normal text-muted line-through">
                {formatPrice(listeFiyati)}
              </span>
              <span className="rounded-[3px] bg-accent/10 px-1.5 py-0.5 font-body text-[10px] font-medium text-accent-deep">
                %{kampanya!.oran}
              </span>
            </>
          ) : (
            <>
              <span className={`price text-ink ${buyuk ? 'text-[16px]' : 'text-[14px]'}`}>
                {formatPrice(listeFiyati)}
              </span>
              {(product as any).override_price &&
                (product as any).override_price < product.display_price && (
                  <span className="price text-[12px] text-muted line-through font-normal">
                    {formatPrice(product.display_price)}
                  </span>
                )}
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
