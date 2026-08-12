'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { FREE_SHIPPING_LABEL, qualifiesForFreeShipping, shippingCostFor } from '@/lib/shipping'

// Sepet localStorage'da tutuluyor; ilk sunucu çıktısıyla uyumsuzluk olmasın diye
// içerik yalnızca hidrasyondan sonra basılır.
const subscribeNoop = () => () => {}

export default function CartPage() {
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  const subtotal = totalPrice()
  const shipping = shippingCostFor(subtotal)
  const hasItems = hydrated && items.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <h1 className="font-heading text-[36px] text-ink mb-8">Sepetiniz</h1>

      {!hydrated ? (
        <p className="text-muted font-body text-sm">Sepet yükleniyor…</p>
      ) : !hasItems ? (
        <div>
          <p className="text-muted font-body text-sm mb-6">Sepetiniz şu anda boş.</p>
          <Link
            href="/urunler"
            className="inline-block bg-accent text-white text-[11px] uppercase tracking-[0.15em] font-body px-8 py-3 hover:bg-accent-deep transition-colors"
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
                <Link href={`/urun/${product.slug}`} className="relative w-20 h-24 bg-surface-muted shrink-0 overflow-hidden">
                  {product.display_images?.[0] && (
                    <Image
                      src={product.display_images[0]}
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
                    className="font-heading text-[15px] text-ink hover:text-accent transition-colors block"
                  >
                    {product.display_title}
                  </Link>
                  <p className="text-[13px] font-body text-accent mt-1">
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
            <div className="bg-surface-muted p-6 space-y-3">
              <div className="flex justify-between text-[13px] font-body text-ink-soft">
                <span>Ara Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-body text-ink-soft">
                <span>Kargo</span>
                <span>{shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}</span>
              </div>
              <p className="text-[11px] font-body text-muted">
                {qualifiesForFreeShipping(subtotal) ? '✓ Ücretsiz kargo' : FREE_SHIPPING_LABEL}
              </p>
              <div className="flex justify-between text-[15px] font-body text-ink font-medium pt-3 border-t border-line">
                <span>Toplam</span>
                <span>{formatPrice(subtotal + shipping)}</span>
              </div>

              <Link
                href="/odeme"
                className="mt-4 block w-full text-center py-3.5 bg-accent text-white text-[11px] uppercase tracking-[0.15em] font-body hover:bg-accent-deep transition-colors"
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
