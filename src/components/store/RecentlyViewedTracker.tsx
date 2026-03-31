'use client'

import { useEffect } from 'react'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

export default function RecentlyViewedTracker({ slug }: { slug: string }) {
  const addItem = useRecentlyViewed((s) => s.addItem)

  useEffect(() => {
    addItem(slug)
  }, [slug, addItem])

  return null
}
