'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCart } from '@/hooks/useCart'
import type { Product } from '@/types'

type Silinen = { product: Product; quantity: number }

const GERI_AL_SURESI_MS = 8000

/**
 * Sepetten kaldırma + "Geri al" (24 Kas 2026 tasarım denetimi).
 *
 * Kaldırma düğmesi 16 px'ti ve dokununca satır onaysız, geri dönüşsüz
 * siliniyordu; adet azaltırken yanlışlıkla silmek kolaydı. Onay penceresi
 * yerine geri alma: akışı kesmez, yanlış dokunuş tek dokunuşla düzelir.
 * Sepet çekmecesi ve /sepet aynı kancayı kullanır.
 */
export function useGeriAlinabilirKaldirma() {
  const removeItem = useCart((s) => s.removeItem)
  const geriKoy = useCart((s) => s.geriKoy)
  const [silinen, setSilinen] = useState<Silinen | null>(null)

  useEffect(() => {
    if (!silinen) return
    const zamanlayici = setTimeout(() => setSilinen(null), GERI_AL_SURESI_MS)
    return () => clearTimeout(zamanlayici)
  }, [silinen])

  const kaldir = useCallback(
    (product: Product, quantity: number) => {
      removeItem(product.id)
      setSilinen({ product, quantity })
    },
    [removeItem]
  )

  const geriAl = useCallback(() => {
    if (!silinen) return
    geriKoy(silinen)
    setSilinen(null)
  }, [geriKoy, silinen])

  return { silinen, kaldir, geriAl }
}

export function GeriAlSatiri({
  silinen,
  onGeriAl,
  className = '',
}: {
  silinen: Silinen | null
  onGeriAl: () => void
  className?: string
}) {
  if (!silinen) return null
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-[4px] bg-surface-muted px-3 font-body text-[13px] text-ink-soft ${className}`}
    >
      <span className="min-w-0 truncate py-2">{silinen.product.display_title} sepetten çıkarıldı.</span>
      <button
        type="button"
        onClick={onGeriAl}
        className="min-h-[44px] shrink-0 px-1 font-medium text-ink underline underline-offset-4"
      >
        Geri al
      </button>
    </div>
  )
}
