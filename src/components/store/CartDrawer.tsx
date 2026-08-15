'use client'

import Image from 'next/image'
import { isRemoteMedia } from '@/lib/images'
import Link from 'next/link'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import Button from '@/components/ui/Button'
import { FREE_SHIPPING_THRESHOLD, qualifiesForFreeShipping, shippingCostFor } from '@/lib/shipping'
import { couponApplies, type CouponReminder } from '@/lib/campaigns'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  coupon?: CouponReminder | null
}

export default function CartDrawer({ isOpen, onClose, coupon }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()
  const subtotal = totalPrice()
  const shipping = shippingCostFor(subtotal)
  const hasItems = items.length > 0

  // Kargo ilerlemesi tek kaynaktan: eşik ve ücret shipping.ts'te tanımlı.
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const freeShippingProgress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD)

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-ink/50 z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-bg z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="font-heading text-[20px] text-ink">
            Sepetiniz ({items.length})
          </h2>
          <button
            onClick={onClose}
            className="text-ink-soft hover:text-accent transition-colors"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {hasItems ? (
          <>
            {/* Ürünler */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.map((item) => {
                const imageUrl =
                  item.product.display_images?.[0] || '/placeholder-product.jpg'
                return (
                  <div
                    key={item.product.id}
                    className="flex gap-4 pb-4 border-b border-line/50"
                  >
                    <div className="relative w-20 h-24 bg-surface-muted shrink-0">
                      <Image
                        src={imageUrl}
                        unoptimized={isRemoteMedia(imageUrl)}
                        alt={item.product.display_title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-[14px] text-ink truncate">
                        {item.product.display_title}
                      </h3>
                      <p className="text-[11px] text-muted font-body mt-0.5">
                        {item.product.trendyol_category}
                      </p>
                      <p className="text-[13px] text-accent font-body font-medium mt-1">
                        {formatPrice(item.product.display_price)}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-line">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-ink-soft hover:text-accent transition-colors"
                            aria-label="Azalt"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-[12px] font-body">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-ink-soft hover:text-accent transition-colors"
                            aria-label="Artır"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-muted hover:text-red-600 transition-colors"
                          aria-label="Kaldır"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Kargo ilerlemesi — eşik, ücret ve kalan tutar shipping.ts'ten */}
            <div className="px-6 py-3 bg-surface-muted/50">
              {qualifiesForFreeShipping(subtotal) ? (
                <p className="text-[11px] font-body text-ink text-center">
                  <span className="text-accent">✓</span> Ücretsiz kargo kazandın
                </p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[11px] font-body text-ink">
                      Ücretsiz kargoya{' '}
                      <span className="price text-ink">{formatPrice(freeShippingRemaining)}</span> kaldı
                    </p>
                    <p className="text-[10px] font-body text-muted shrink-0">
                      Kargo: {formatPrice(shipping)}
                    </p>
                  </div>
                  <div
                    className="mt-2 h-1 bg-line rounded-full overflow-hidden"
                    role="progressbar"
                    aria-label="Ücretsiz kargo ilerlemesi"
                    aria-valuemin={0}
                    aria-valuemax={FREE_SHIPPING_THRESHOLD}
                    aria-valuenow={Math.round(subtotal)}
                  >
                    {/* Genişlik değil ölçek anime edilir — yalnız transform. */}
                    <div
                      className="h-full bg-accent origin-left motion-safe:transition-transform motion-safe:duration-500"
                      style={{ transform: `scaleX(${freeShippingProgress})` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Kupon hatırlatması — yalnız kampanya bu sepete uygulanabiliyorsa */}
            {couponApplies(coupon ?? null, subtotal) && (
              <div className="px-6 py-2.5 border-t border-line">
                <p className="text-[11px] font-body text-ink-soft">
                  <span className="text-accent">✦</span> {coupon!.label}
                  <span className="text-muted"> — ödeme adımında uygulanır</span>
                </p>
              </div>
            )}

            {/* Alt kısım */}
            <div className="px-6 py-5 border-t border-line">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-body text-ink-soft uppercase tracking-wider">
                  Ara Toplam
                </span>
                <span className="text-[16px] font-body text-accent font-medium">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Link
                href="/odeme"
                onClick={onClose}
                className="block w-full py-3.5 bg-accent text-white text-center text-[11px] uppercase tracking-[0.15em] font-body hover:bg-accent-deep transition-colors"
              >
                Ödemeye Geç
              </Link>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 border border-ink/30 text-ink text-[11px] uppercase tracking-[0.15em] font-body hover:border-ink transition-colors text-center"
              >
                Alışverişe Devam Et
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <ShoppingBag size={48} className="text-line mb-4" />
            <p className="text-[13px] font-body text-muted">Sepetiniz boş</p>
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Alışverişe Başla
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
