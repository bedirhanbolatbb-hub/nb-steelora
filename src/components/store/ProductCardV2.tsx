'use client'

import Image from 'next/image'
import { Check, ShoppingBag, Star } from 'lucide-react'
import { useSepetPaneli } from '@/hooks/useSepetPaneli'
import { vitrinFiyati } from '@/lib/campaigns/vitrinFiyat'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ViewTransition, useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { resolveBadge } from '@/lib/catalog/badge'
import { materialShort } from '@/lib/catalog/material'
import ProductImage from './ProductImage'
import { IMAGE_QUALITY, isRemoteMedia, trendyolCdnMi, trendyolYukleyici } from '@/lib/images'
import { useCart } from '@/hooks/useCart'
import type { Product } from '@/types'
import { useVitrinIndirimi } from '@/components/store/KampanyaContext'
import { useKadraj } from '@/components/store/KadrajContext'

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
  // ─── KART GÖRÜNÜNCE DEĞİL, İMLEÇ/PARMAK GELİNCE ISITILIR (12 Kas 2026) ───
  // Next, görünür alana giren her bağlantının sayfasını arka planda ister.
  // Vitrin her istekte sunucuda kurulduğu için bu, kimsenin açmadığı ürün
  // sayfaları için tam sayfa kurulumu demekti (lib/analytics/server.ts:
  // "6 dakikada 68 ürün sayfası"). Site 12 Kas'ta Vercel'in ücretsiz aylık
  // sunucu süresine taşındı (ayda 4 saat); ızgaradaki her kart birkaç yüz
  // ms yiyordu. Hız korunuyor: imleç ya da parmak karta değdiği an sayfa
  // ısıtılır — tıklamadan önce.
  const router = useRouter()
  const urunAdresi = `/urun/${product.slug}`
  const onPointerEnter = () => {
    router.prefetch(urunAdresi)
    if (hoverHazir || !hoverVar) return
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return
    setHoverHazir(true)
  }

  // Faz 35: kart görseli takıya göre kadrajlanır (ürün başına panelden kapatılabilir).
  const kadrajAcik = useKadraj(product.id)

  const addItem = useCart((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const outOfStock = product.trendyol_stock === 0
  // 24 Kas 2026 tasarım denetimi: "Son 1 adet" rozeti seçenekli kartta
  // basılmaz — rozet yalnız kapak seçeneğin stoğunu anlatıyordu, "+8 seçenek"
  // ile yan yana çelişkili ve baskı gibi okunuyordu (üstelik iki rozet dar
  // kartta üst üste biniyordu). Ürün sayfasında seçili seçenek için görünür.
  const hamRozet = resolveBadge(product as any)
  const badge = optionCount > 0 && hamRozet?.tone === 'urgent' ? null : hamRozet
  const malzeme = materialShort((product as any).material_type)
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
    addItem(product, 1, 'kart')
    setAdded(true)
    // Faz 11A: karttan eklemede de sepet paneli açılır.
    panelAc()
    setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS)
  }

  return (
    <Link href={urunAdresi} prefetch={false} className="group block" onPointerEnter={onPointerEnter}>
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
            // Büyük kart mobilde 4:5, masaüstünde 5:4 — iki kutuya da taşmadan
            // oturan kare kadraj; normal kart 4:5.
            kadraj={kadrajAcik ? (buyuk ? '11' : '45') : null}
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

        {/* Tek rozet — mevcut öncelik kuralı. Seçenek sayısı görselin üstünden
            adın altına alındı (24 Kas 2026): fotoğrafta tek etiket kalır. */}
        {badge && !outOfStock && (
          <span className="absolute left-2 top-2 rounded-[2px] bg-bg/95 px-2 py-1 font-body text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-ink">
            {badge.label}
          </span>
        )}

        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-[2px] bg-ink px-2 py-1 font-body text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-bg">
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
          className="absolute bottom-0 left-0 right-0 hidden py-3 bg-ink/90 text-bg text-[12px] tracking-[0.1em] uppercase font-body font-semibold text-center backdrop-blur-[2px]
            sm:block sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent-deep transition-opacity duration-300
            disabled:bg-line disabled:text-muted disabled:cursor-not-allowed"
        >
          {outOfStock ? 'Tükendi' : added ? 'Eklendi ✓' : 'Sepete Ekle'}
        </button>
      </div>
      </ViewTransition>

      {/* 24 Kas 2026 tasarım denetimi — kartın yazı bloğu:
          · sola yaslı (ızgarada adlar ve fiyatlar tek hizada okunur),
          · ad Inter 14/500, iki satırlık SABİT blok (fiyat satırları hizalı),
          · malzeme + seçenek sayısı tek ince satırda,
          · fiyat mürekkep 16/600; altın yalnız indirim rozetinin zemininde. */}
      <div className="pt-3 pb-1">
        <h3
          className={`font-body font-medium leading-[1.4] text-ink line-clamp-2 min-h-[2.8em] transition-colors group-hover:text-accent-deep ${
            buyuk ? 'text-[14px] sm:text-[16px]' : 'text-[14px]'
          }`}
        >
          {product.display_title}
        </h3>

        {(malzeme || optionCount > 0) && (
          <p className="mt-1 truncate font-body text-[12px] text-muted">
            {[malzeme, optionCount > 0 ? `${optionCount + 1} seçenek` : null].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Sosyal kanıt (Faz 11D): yalnız ONAYLI yorumu olan üründe yıldız +
            sayı; yorum yoksa hiçbir şey basılmaz — sahte doluluk yok. */}
        {Number((product as any).review_count) > 0 && (
          <p className="mt-1 flex items-center gap-1 font-body text-[12px] text-ink-soft">
            <Star size={12} className="fill-accent-deep text-accent-deep" aria-hidden />
            <span className="tabular-nums">{Number((product as any).avg_rating ?? 0).toFixed(1)}</span>
            <span className="text-muted">({Number((product as any).review_count)})</span>
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {kampanyaliFiyat != null ? (
            <>
              <span className={`price text-ink ${buyuk ? 'text-[16px] sm:text-[18px]' : 'text-[16px]'}`}>
                {formatPrice(kampanyaliFiyat)}
              </span>
              <span className="price text-[12px] font-normal text-muted line-through">
                {formatPrice(listeFiyati)}
              </span>
              <span className="rounded-[2px] bg-accent-soft px-1.5 py-0.5 font-body text-[11px] font-semibold leading-none text-ink">
                %{kampanya!.oran}
              </span>
            </>
          ) : (
            <>
              <span className={`price text-ink ${buyuk ? 'text-[16px] sm:text-[18px]' : 'text-[16px]'}`}>
                {formatPrice(listeFiyati)}
              </span>
              {(product as any).override_price &&
                (product as any).override_price < product.display_price && (
                  <span className="price text-[13px] text-muted line-through font-normal">
                    {formatPrice(product.display_price)}
                  </span>
                )}
            </>
          )}
        </div>
        {kampanya?.rozet && (
          <p className="mt-1 font-body text-[12px] text-accent-deep">{kampanya.rozet}</p>
        )}
      </div>
    </Link>
  )
}
