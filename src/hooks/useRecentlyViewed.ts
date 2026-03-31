import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentlyViewedStore {
  items: string[]
  addItem: (slug: string) => void
  clear: () => void
}

export const useRecentlyViewed = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (slug: string) => {
        const items = get().items.filter((s) => s !== slug)
        set({ items: [slug, ...items].slice(0, 8) })
      },
      clear: () => set({ items: [] }),
    }),
    { name: 'nb-steelora-recently-viewed' }
  )
)
