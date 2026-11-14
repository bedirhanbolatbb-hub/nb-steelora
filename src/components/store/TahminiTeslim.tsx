'use client'

import { useSyncExternalStore } from 'react'
import { tahminiTeslimEtiketi } from '@/lib/shipping'

/**
 * Tahmini teslim aralığı — o anki tarihe göre tarayıcıda (14 Kas 2026).
 * Sayfa önbellekten geldiği için sunucudaki tarih bir saate kadar eski
 * olabilir (gece yarısından sonra bir gün kayardı). Sunucu ve hidrasyon
 * çizimi sunucunun değerini (`ilk`) basar, ardından güncel tarihle hesaplanır.
 */
const abone = () => () => {}

export default function TahminiTeslim({ ilk }: { ilk: string }) {
  const etiket = useSyncExternalStore(abone, () => tahminiTeslimEtiketi(), () => ilk)
  return <>{etiket}</>
}
