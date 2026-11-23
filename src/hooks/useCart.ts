import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'
import { izle } from '@/lib/analytics/izle'
import type { SepetKaynagi } from '@/lib/analytics/olayMeta'
import { esitlemeNotu, sepetiEsitle, type SunucuFiyati } from '@/lib/campaigns/sepetEsitleme'

// Sepete eklemenin yapıldığı yer (Faz 36) — tek kaynak lib/analytics/olayMeta.
export type { SepetKaynagi }

interface CartItem {
  product: Product
  quantity: number
}

interface CartStore {
  items: CartItem[]
  /**
   * Bu oturumda sepet sunucuyla eşitlendiyse müşteriye gösterilecek tek satır
   * (21 Kas 2026). Kalıcı DEĞİL (sayfa yenilenince silinir); eşitlemeyi hangi
   * ekran yaptıysa (sepet çekmecesi, sepet, ödeme) ödeme adımı bu notu gösterir.
   */
  esitlemeNotu: string | null
  addItem: (product: Product, quantity?: number, kaynak?: SepetKaynagi) => void
  removeItem: (productId: string) => void
  /**
   * Kaldırılan satırı geri koyar ("Geri al", 24 Kas 2026). Sepete ekleme
   * ölçümü ÜRETMEZ: geri alma yeni bir ekleme değildir, huniyi şişirmesin.
   */
  geriKoy: (item: CartItem) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  /**
   * Sepeti sunucudaki güncel fiyatla eşitler, satışta olmayanı çıkarır
   * (21 Kas 2026 · lib/campaigns/sepetEsitleme). Sepet özeti her geldiğinde
   * çağrılır; değişiklik yoksa sepete hiç yazılmaz.
   */
  sunucuylaEsitle: (
    fiyatlar: SunucuFiyati[] | null | undefined,
    gecersizler: string[] | null | undefined
  ) => { fiyatiDegisen: number; cikarilan: number }
  totalItems: () => number
  totalPrice: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      esitlemeNotu: null,

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

      geriKoy: (item) => {
        const items = get().items
        if (items.some((i) => i.product.id === item.product.id)) return
        set({ items: [...items, item] })
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

      sunucuylaEsitle: (fiyatlar, gecersizler) => {
        const sonuc = sepetiEsitle(get().items, fiyatlar, gecersizler)
        if (sonuc.degisti) set({ items: sonuc.items, esitlemeNotu: esitlemeNotu(sonuc) })
        return { fiyatiDegisen: sonuc.fiyatiDegisen, cikarilan: sonuc.cikarilan }
      },

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, i) => sum + i.product.display_price * i.quantity,
          0
        ),
    }),
    {
      name: 'nb-steelora-cart',
      // Yalnız kalemler saklanır; eşitleme notu oturumluktur (21 Kas 2026).
      partialize: (s) => ({ items: s.items }),
    }
  )
)
