'use client'

import Image from 'next/image'
import { Check, ShoppingBag, Star } from 'lucide-react'
import { useSepetPaneli } from '@/hooks/useSepetPaneli'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import Link from 'next/link'
import { ViewTransition, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { resolveBadge } from '@/lib/catalog/badge'
import ProductImage from './ProductImage'
import { IMAGE_QUALITY, isRemoteMedia, trendyolCdnMi, trendyolYukleyici } from '@/lib/images'
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
  /**
   * Faz 12: paylaşılan geçiş adı. Aynı ürün bir sayfada iki kez basılıyorsa
   * (ana sayfada Öne Çıkanlar + Yeni Gelenler) ad çakışır ve tarayıcı geçişi
   * iptal eder; ikinci yüzey `morph={false}` verir.
   */
  morph?: boolean
}

const ADDED_FEEDBACK_MS = 1200

export default function ProductCardV2({
  product,
  priority = false,
  optionCount = 0,
  buyuk = false,
  morph = true,
}: ProductCardV2Props) {
  const images = (product.display_images as string[] | null) ?? []
  const primaryImage = images[0] ?? (product as any).trendyol_images?.[0] ?? null
  // Kaynağında ölü (403/404) hover görseli, üzerine gelindiğinde ana görselin
  // yerine boş kutu bırakıyordu — yüklenemeyen hover görseli devre dışı kalır
  // ve kart tek görselle çalışmayı sürdürür (Faz 9B).
  const [hoverFailed, setHoverFailed] = useState(false)
  // Faz 12 (Lighthouse mobil ölçümü): hover görseli kart ekrana girer girmez
  // iniyordu — telefonda hover yok, o indirme tamamen boşa; ana sayfada
  // 8 kart × ~100-210 KB. Artık yalnız imleç karta İLK geldiğinde bağlanır.
  const [hoverHazir, setHoverHazir] = useState(false)
  const [hoverIndi, setHoverIndi] = useState(false)
  const hoverImage = hoverFailed || !hoverHazir ? null : images[1] ?? null
  const hoverVar = !hoverFailed && Boolean(images[1])
  const onPointerEnter = () => {
    if (hoverHazir || !hoverVar) return
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return
    setHoverHazir(true)
  }

  const addItem = useCart((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const outOfStock = product.trendyol_stock === 0
  const badge = resolveBadge(product as any)
  // Aktif otomatik kampanya varsa kartta üstü çizili fiyat + oran rozeti
  // gösterilir; tutar yine sepette tek motordan hesaplanır (Faz 15).
  const kampanya = useVitrinIndirimi()
  const panelAc = useSepetPaneli((s) => s.ac)
  const listeFiyati = Number((product as any).override_price ?? product.display_price) || 0
  // Koşullu kampanyada (min sepet, kategori kapsamı, X al Y öde…) kartta
  // indirimli fiyat GÖSTERİLMEZ: müşteri tek ürün alırken o fiyata ulaşamaz.
  // Yerine koşulu anlatan küçük bir rozet basılır (Faz 17).
  // Faz 11A: hesap tek kaynaktan (lib/campaigns/vitrinFiyat.ts). Aynı formül
  // burada ve ürün sayfasında ayrı ayrı yazılıydı, kalan yüzeylerde hiç yoktu.
  const fiyat = vitrinFiyati(listeFiyati, kampanya)
  const kampanyaliFiyat = fiyat.indirimliMi ? fiyat.gosterilen : null

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (outOfStock || added) return
    addItem(product)
    setAdded(true)
    // Faz 11A: karttan eklemede de sepet paneli açılır.
    panelAc()
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
  }

  return (
    <Link href={`/urun/${product.slug}`} className="group block" onPointerEnter={onPointerEnter}>
      {/* Faz 12: paylaşılan öğe geçişi — kart görseli ürün sayfasındaki
          galeriye AKARAK büyür (aynı `name`, ProductImageGallery). Tarayıcı
          desteklemiyorsa ya da hareket azaltma açıksa normal geçiş. */}
      <ViewTransition name={morph ? `urun-${product.id}` : undefined} share="morph" default="none">
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
            // Faz 12: boyutu artık next/image `sizes`'tan seçer (ProductImage →
            // trendyolYukleyici). Büyük kart 1400'lük kapta en çok ~680 piksel.
            sizes={buyuk ? '(max-width: 640px) 50vw, (max-width: 1400px) 48vw, 680px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 340px'}
            enBoy={buyuk ? 1100 : 680}
            bulanik
            priority={priority}
            className={`object-cover transition-all duration-700 ${
              hoverImage && hoverIndi ? 'group-hover:opacity-0' : 'group-hover:scale-[1.04]'
            }`}
          />
        )}

        {hoverImage && (
          <Image
            src={hoverImage}
            loader={trendyolCdnMi(hoverImage) ? trendyolYukleyici : undefined}
            unoptimized={trendyolCdnMi(hoverImage) ? false : isRemoteMedia(hoverImage)}
            alt=""
            aria-hidden
            fill
            sizes={buyuk ? '(max-width: 640px) 50vw, (max-width: 1400px) 48vw, 680px' : '(max-width: 640px) 50vw, 340px'}
            quality={IMAGE_QUALITY}
            className={`object-cover transition-opacity duration-700 ${hoverIndi ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
            onLoad={() => setHoverIndi(true)}
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
          // Mobilde sağ alt köşeyi çanta düğmesi tutuyor: seçenek rozeti
          // orada üst üste binerdi, sağ üste alınıyor. Masaüstünde yeri aynı.
          <span className="absolute right-3 top-3 bg-bg/95 text-ink text-[9px] px-2 py-0.5 font-body tracking-[0.08em] rounded-[2px] sm:bottom-3 sm:top-auto">
            +{optionCount} seçenek
          </span>
        )}

        {outOfStock && (
          <span className="absolute bottom-3 left-3 bg-ink text-bg text-[9px] px-2 py-0.5 font-body tracking-[0.08em] rounded-[2px]">
            Tükendi
          </span>
        )}

        {/* ── Hızlı ekleme ──
            Faz 11B: mobilde kartın altında KALICI siyah bant vardı; sekiz
            kartlık ızgarada sekiz siyah çubuk, ürünün kendisinden çok yer
            kaplıyordu. Bant kaldırıldı ama SATIŞ KANALI DURUYOR: ilk gerçek
            müşteri dört eklemenin üçünü kart üzerinden yaptı.

            Mobil: köşede küçük çanta düğmesi (44×44 dokunma hedefi, görsel
            daire 36px). Masaüstü: eski davranış — hover'da alttan çıkan
            "Sepete Ekle" bandı aynen kalır. */}
        {!outOfStock && (
          <button
            onClick={handleQuickAdd}
            aria-label={added ? 'Sepete eklendi' : 'Sepete ekle'}
            className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center sm:hidden"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors ${
                added ? 'bg-accent-deep text-white' : 'bg-bg/95 text-ink'
              }`}
            >
              {added ? <Check size={16} strokeWidth={2} /> : <ShoppingBag size={16} strokeWidth={1.6} />}
            </span>
          </button>
        )}

        <button
          onClick={handleQuickAdd}
          disabled={outOfStock}
          className="absolute bottom-0 left-0 right-0 hidden py-3 bg-ink/90 text-bg text-[10px] tracking-[0.18em] uppercase font-body font-medium text-center backdrop-blur-[2px]
            sm:block sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent-deep transition-opacity duration-300
            disabled:bg-line disabled:text-muted disabled:cursor-not-allowed"
        >
          {outOfStock ? 'Tükendi' : added ? 'Eklendi ✓' : 'Sepete Ekle'}
        </button>
      </div>
      </ViewTransition>

      <div className="pt-3.5 pb-1 text-center">
        <h3
          className={`font-heading text-ink clamp-2 leading-snug transition-colors group-hover:text-accent-deep ${
            // Faz 11B: büyük kart mobilde 2 sütuna indi; tipografi büyütmesi
            // yalnız masaüstünde geçerli, yoksa dar sütunda başlık taşıyor.
            // Faz 12: kart adı BİLEREK serif (Playfair) — eskiden `font-body`
            // yazılıydı ama katman hatası yüzünden zaten serif basılıyordu;
            // artık açıkça seçili ve bir kademe büyük (13 → 14/15 px).
            buyuk ? 'text-[14px] sm:text-[16px] font-medium min-h-[2.6em] sm:min-h-0' : 'text-[14px] sm:text-[15px] font-medium min-h-[2.6em]'
          }`}
        >
          {product.display_title}
        </h3>

        {/* Sosyal kanıt (Faz 11D): yalnız ONAYLI yorumu olan üründe yıldız +
            sayı; yorum yoksa hiçbir şey basılmaz — sahte doluluk yok. */}
        {Number((product as any).review_count) > 0 && (
          <p className="mt-1 flex items-center justify-center gap-1 font-body text-[11px] text-ink-soft">
            <Star size={11} className="fill-accent-deep text-accent-deep" aria-hidden />
            <span className="tabular-nums">{Number((product as any).avg_rating ?? 0).toFixed(1)}</span>
            <span className="text-muted">({Number((product as any).review_count)})</span>
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
          {kampanyaliFiyat != null ? (
            <>
              <span className={`price text-accent-deep ${// Faz 11B: mobilde büyük kart artık 2 sütunda; fiyat büyütmesi de
            // başlık gibi yalnız masaüstünde geçerli (kart boyları eşitlensin).
            buyuk ? 'text-[14px] sm:text-[16px]' : 'text-[14px]'}`}>
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
              <span className={`price text-ink ${buyuk ? 'text-[14px] sm:text-[16px]' : 'text-[14px]'}`}>
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
        {kampanya?.rozet && (
          <p className="mt-1 text-center font-body text-[10px] text-accent-deep">{kampanya.rozet}</p>
        )}
      </div>
    </Link>
  )
}
