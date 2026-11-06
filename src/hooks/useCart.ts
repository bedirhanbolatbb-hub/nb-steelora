import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'
import { izle } from '@/lib/analytics/izle'

/**
 * Sepete eklemenin YAPILDIĞI YER (Faz 36). Ölçümde `meta.kaynak` olarak
 * yazılır; panel analizde "Sepete ekleme nereden?" kırılımı buradan gelir.
 * Sayfa yolu zaten kaydediliyor ama ürün sayfasındaki asıl düğme ile mobil
 * alt çubuğu yoldan ayırt edilemiyordu.
 */
export type SepetKaynagi = 'pdp' | 'yapiskan' | 'kart' | 'paylasim'

interface CartItem {
  product: Product
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, kaynak?: SepetKaynagi) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, kaynak) => {
        const items = get().items
        const existing = items.find(i => i.product.id === product.id)

        // Ölçüm (Faz 12) — ateşle-unut, sepet akışını etkilemez.
        izle('add_to_cart', {
          productId: product.id,
          value: Number(product.display_price) * quantity || null,
          meta: kaynak ? { quantity, kaynak } : { quantity },
        })

        if (existing) {
          set({
            items: items.map(i =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity }] })
        }
      },

      removeItem: (productId) => {
        izle('remove_from_cart', { productId })
        set({ items: get().items.filter(i => i.product.id !== productId) })
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, i) => sum + i.product.display_price * i.quantity,
          0
        ),
    }),
    { name: 'nb-steelora-cart' }
  )
)
