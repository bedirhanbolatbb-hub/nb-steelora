'use client'

import Image from 'next/image'
import { isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { FREE_SHIPPING_LABEL, SHIPPING_LINE_LABEL, shippingCostFor } from '@/lib/shipping'
import { couponApplies, type CouponReminder } from '@/lib/campaigns'
import { useOtomatikIndirim } from '@/hooks/useOtomatikIndirim'

// Sepet localStorage'da tutuluyor; ilk sunucu çıktısıyla uyumsuzluk olmasın diye
// içerik yalnızca hidrasyondan sonra basılır.
const subscribeNoop = () => () => {}

export default function CartPageClient({ coupon }: { coupon: CouponReminder | null }) {
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  const subtotal = totalPrice()
  const shipping = shippingCostFor(subtotal)
  // Kampanya indirimi ödeme adımını beklemeden burada da görünür (Faz 15).
  const { indirim } = useOtomatikIndirim(
    subtotal,
    items.reduce((t, i) => t + (Number(i.quantity) || 1), 0),
    items.flatMap((i) =>
      Array.from({ length: Number(i.quantity) || 1 }, () => Number(i.product.display_price) || 0)
    )
  )
  const indirimTutari = indirim?.amount ?? 0
  const hasItems = hydrated && items.length > 0


  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-14 lg:py-20">
      <header className="mb-10 border-b border-line pb-6">
        <p className="eyebrow">Sipariş</p>
        <h1 className="font-heading text-[38px] lg:text-[48px] font-medium text-ink mt-2">Sepetiniz</h1>
      </header>

      {!hydrated ? (
        <p className="text-muted font-body text-sm">Sepet yükleniyor…</p>
      ) : !hasItems ? (
        <div>
          <p className="text-muted font-body text-sm mb-6">Sepetiniz şu anda boş.</p>
          <Link
            href="/urunler"
            className="inline-block bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium px-8 py-3.5 rounded-[4px] hover:bg-accent-deep transition-colors"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Ürünler */}
          <div className="flex-1 space-y-4">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-4 border-b border-line pb-4"
              >
                <Link href={`/urun/${product.slug}`} className="relative w-24 aspect-[4/5] rounded-[4px] bg-surface-muted shrink-0 overflow-hidden">
                  {product.display_images?.[0] && (
                    <Image
                      src={product.display_images[0]}
                      unoptimized={isRemoteMedia(product.display_images[0])}
                      alt={product.display_title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/urun/${product.slug}`}
                    className="font-heading text-[17px] font-medium text-ink hover:text-accent-deep transition-colors block leading-snug"
                  >
                    {product.display_title}
                  </Link>
                  <p className="price text-[13px] text-ink mt-1.5">
                    {formatPrice(product.display_price)}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-line">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="p-1.5 text-ink-soft hover:text-accent transition-colors"
                        aria-label="Azalt"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-3 text-[12px] font-body">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="p-1.5 text-ink-soft hover:text-accent transition-colors"
                        aria-label="Artır"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(product.id)}
                      className="text-muted hover:text-red-500 transition-colors"
                      aria-label="Kaldır"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-[14px] font-body text-ink shrink-0">
                  {formatPrice(product.display_price * quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Özet */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="bg-surface border border-line rounded-[4px] p-6 space-y-3 lg:sticky lg:top-28">
              <div className="flex justify-between text-[13px] font-body text-ink-soft">
                <span>Ara Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-body text-ink-soft">
                <span>Kargo</span>
                <span>{shipping === 0 ? SHIPPING_LINE_LABEL : formatPrice(shipping)}</span>
              </div>
              <p className="text-[11px] font-body text-ink">
                <span className="text-accent">✓</span> {FREE_SHIPPING_LABEL}
              </p>

              {/* Kupon hatırlatması — otomatik kampanya daha avantajlıysa
                  "uygulanır" demek yanıltıcı olur: indirimler toplanmıyor. */}
              {couponApplies(coupon, subtotal) && (
                <p className="text-[11px] font-body text-ink-soft pt-1">
                  <span className="text-accent">✦</span> {coupon.label}
                  <span className="text-muted">
                    {indirimTutari > 0
                      ? ' — yukarıdaki kampanya daha avantajlı, o uygulanıyor'
                      : ' — ödeme adımında uygulanır'}
                  </span>
                </p>
              )}
              {indirim && (
                <div className="flex justify-between text-[13px] font-body text-accent">
                  <span>{indirim.name}</span>
                  <span>−{formatPrice(indirimTutari)}</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-body text-ink font-medium pt-3 border-t border-line">
                <span>Toplam</span>
                <span>{formatPrice(Math.max(0, subtotal - indirimTutari) + shipping)}</span>
              </div>
              {indirim && (
                <p className="text-[11px] font-body text-accent-deep">
                  {formatPrice(indirimTutari)} kazandınız
                </p>
              )}

              <Link
                href="/odeme"
                className="mt-4 block w-full text-center py-4 bg-ink text-bg text-[11px] uppercase tracking-[0.18em] font-body font-medium rounded-[4px] hover:bg-accent-deep transition-colors"
              >
                Ödemeye Geç
              </Link>
              <Link
                href="/urunler"
                className="block text-center text-[11px] font-body text-muted hover:text-accent transition-colors"
              >
                Alışverişe devam et
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
