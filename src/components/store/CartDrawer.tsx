'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import Button from '@/components/ui/Button'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()
  const subtotal = totalPrice()
  const shipping = subtotal >= 500 ? 0 : 49.9
  const hasItems = items.length > 0

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-dark/50 z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-champagne z-50 transform transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-champagne-mid">
          <h2 className="font-heading text-[20px] text-text-primary">
            Sepetiniz ({items.length})
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-gold transition-colors"
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
                    className="flex gap-4 pb-4 border-b border-champagne-mid/50"
                  >
                    <div className="relative w-20 h-24 bg-champagne-dark shrink-0">
                      <Image
                        src={imageUrl}
                        alt={item.product.display_title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-[14px] text-text-primary truncate">
                        {item.product.display_title}
                      </h3>
                      <p className="text-[11px] text-text-muted font-body mt-0.5">
                        {item.product.trendyol_category}
                      </p>
                      <p className="text-[13px] text-gold font-body font-medium mt-1">
                        {formatPrice(item.product.display_price)}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-champagne-mid">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-gold transition-colors"
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
                            className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-gold transition-colors"
                            aria-label="Artır"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-text-muted hover:text-red-600 transition-colors"
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

            {/* Kargo bilgisi */}
            <div className="px-6 py-3 bg-champagne-dark/50 text-center">
              <p className="text-[10px] font-body text-text-muted tracking-wider uppercase">
                {subtotal >= 500
                  ? '✓ Ücretsiz kargo'
                  : `500₺ üzeri ücretsiz kargo · Kargo: ${formatPrice(shipping)}`}
              </p>
            </div>

            {/* Alt kısım */}
            <div className="px-6 py-5 border-t border-champagne-mid">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-body text-text-secondary uppercase tracking-wider">
                  Ara Toplam
                </span>
                <span className="text-[16px] font-body text-gold font-medium">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Link
                href="/odeme"
                onClick={onClose}
                className="block w-full py-3.5 bg-gold text-white text-center text-[11px] uppercase tracking-[0.15em] font-body hover:bg-gold-light transition-colors"
              >
                Ödemeye Geç
              </Link>
              <button
                onClick={onClose}
                className="block w-full mt-2 py-2 text-[11px] uppercase tracking-[0.15em] font-body text-text-muted hover:text-gold transition-colors text-center"
              >
                Alışverişe Devam Et
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <ShoppingBag size={48} className="text-champagne-mid mb-4" />
            <p className="text-[13px] font-body text-text-muted">Sepetiniz boş</p>
            <Button variant="outline" className="mt-6" onClick={onClose}>
              Alışverişe Başla
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
