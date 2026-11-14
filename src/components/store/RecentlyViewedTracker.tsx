'use client'

import { useEffect } from 'react'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

/**
 * Ürün sayfası açıldığında: "son baktıklarınız" listesine ekler ve ürün
 * görüntülemeyi ölçer.
 *
 * 14 Kas 2026: ürün görüntüleme önceden sunucuda yazılıyordu (sayfa her
 * istekte çiziliyordu); ürün sayfası artık önbellekten veriliyor, ölçüm
 * buradan /api/analytics/track'e gider. Robot ve kendi trafiğimiz orada
 * süzülür; önceden yükleme zaten sayılmaz (yalnız açılan sayfa).
 */
export default function RecentlyViewedTracker({ slug, productId }: { slug: string; productId?: string }) {
  const addItem = useRecentlyViewed((s) => s.addItem)

  useEffect(() => {
    addItem(slug)
  }, [slug, addItem])

  useEffect(() => {
    if (!productId) return
    const govde = JSON.stringify({ event: 'product_view', path: window.location.pathname, productId })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', new Blob([govde], { type: 'application/json' }))
        return
      }
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: govde,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // Ölçüm hiçbir koşulda kullanıcı akışını bozmaz.
    }
  }, [productId])

  return null
}
