'use client'

import { createContext, useContext } from 'react'
import type { SaticiPuani } from '@/lib/metin/saticiPuani'
import { SaticiPuaniSatiri } from './SaticiPuani'

/**
 * Trendyol satıcı puanı bağlamı (8 Kas 2026). Değer vitrin kabuğunda bir kez
 * okunur (layout → lib/metin/saticiPuani) ve istemci bileşenlerine (sepet
 * paneli, /sepet, ödeme) buradan dağıtılır. Sağlayıcı yoksa (panel) null —
 * rozet basılmaz. Değer sunucuda hesaplanıp hazır metin olarak gelir; istemci
 * tarih/saat hesaplamaz (hidrasyon farkı çıkmaz).
 */
const Baglam = createContext<SaticiPuani | null>(null)

export function SaticiPuaniSaglayici({
  veri,
  children,
}: {
  veri: SaticiPuani | null
  children: React.ReactNode
}) {
  return <Baglam.Provider value={veri}>{children}</Baglam.Provider>
}

export function useSaticiPuani(): SaticiPuani | null {
  return useContext(Baglam)
}

/** Bağlamdan okuyan tek satır; puan yoksa hiçbir şey basmaz. */
export function BaglamliSaticiPuaniSatiri({ className }: { className?: string }) {
  const veri = useSaticiPuani()
  return veri ? <SaticiPuaniSatiri veri={veri} className={className} /> : null
}
