import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'

interface WishlistStore {
  items: string[]
  guestId: string
  addItem: (productId: string) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  toggleItem: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  syncWithServer: () => Promise<void>
}

function generateGuestId() {
  return 'guest_' + Math.random().toString(36).substr(2, 9)
}

export const useWishlist = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      guestId: generateGuestId(),

      addItem: async (productId) => {
        set((state) => ({ items: [...state.items, productId] }))
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          await supabase.from('wishlists').upsert({
            product_id: productId,
            user_id: user?.id || null,
            guest_id: user ? null : get().guestId,
          })
        } catch (e) {
          console.error('Wishlist add error:', e)
        }
      },

      removeItem: async (productId) => {
        set((state) => ({
          items: state.items.filter((id) => id !== productId),
        }))
        try {
          const supabase = createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('wishlists')
              .delete()
              .eq('product_id', productId)
              .eq('user_id', user.id)
          } else {
            await supabase
              .from('wishlists')
              .delete()
              .eq('product_id', productId)
              .eq('guest_id', get().guestId)
          }
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

          let query = supabase.from('wishlists').select('product_id')
          if (user) {
            query = query.eq('user_id', user.id)
          } else {
            query = query.eq('guest_id', get().guestId)
          }

          const { data } = await query
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
