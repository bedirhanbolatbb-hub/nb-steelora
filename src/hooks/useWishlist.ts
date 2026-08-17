import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { izle } from '@/lib/analytics/client'

interface WishlistStore {
  items: string[]
  addItem: (productId: string) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  toggleItem: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  syncWithServer: () => Promise<void>
}

// Misafir listesi yalnızca localStorage'da tutulur. wishlists RLS politikası
// satırları auth.uid() = user_id ile sınırlıyor, oturumsuz yazma reddedilir;
// bu yüzden oturum yoksa sunucuya hiç gidilmez.
export const useWishlist = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (productId) => {
        izle('favorite_add', { productId })
        set((state) => ({ items: [...state.items, productId] }))
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return
          await supabase.from('wishlists').upsert({
            product_id: productId,
            user_id: user.id,
          })
        } catch (e) {
          console.error('Wishlist add error:', e)
        }
      },

      removeItem: async (productId) => {
        izle('favorite_remove', { productId })
        set((state) => ({
          items: state.items.filter((id) => id !== productId),
        }))
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) return
          await supabase
            .from('wishlists')
            .delete()
            .eq('product_id', productId)
            .eq('user_id', user.id)
        } catch (e) {
          console.error('Wishlist remove error:', e)
        }
      },

      toggleItem: async (productId) => {
        if (get().isInWishlist(productId)) {
          await get().removeItem(productId)
        } else {
          await get().addItem(productId)
        }
      },

      isInWishlist: (productId) => get().items.includes(productId),

      syncWithServer: async () => {
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) return

          const { data } = await supabase
            .from('wishlists')
            .select('product_id')
            .eq('user_id', user.id)
          if (data) {
            set({ items: data.map((w) => w.product_id) })
          }
        } catch (e) {
          console.error('Wishlist sync error:', e)
        }
      },
    }),
    { name: 'nb-steelora-wishlist' }
  )
)
