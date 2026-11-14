'use client'

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
import type { VitrinIndirimi } from '@/lib/campaigns/vitrinIndirimi'

const Kampanya = createContext<VitrinIndirimi | null>(null)

/** Vitrin genelinde aktif otomatik indirimi taşır (Faz 15). */
export function KampanyaSaglayici({
  indirim,
  children,
}: {
  indirim: VitrinIndirimi | null
  children: React.ReactNode
}) {
  // 14 Kas 2026: sayfalar önbellekten geldiği için kampanya bitişi burada
  // izlenir — bitiş anı geçince indirim kartlardan, sepet panelinden ve ürün
  // fiyatından aynı anda düşer (ödeme zaten sunucuda hesaplanıyor).
  const bitti = useBittiMi(indirim?.bitis ?? null)
  return <Kampanya.Provider value={bitti ? null : indirim}>{children}</Kampanya.Provider>
}

export function useVitrinIndirimi() {
  return useContext(Kampanya)
}

/**
 * Bitiş anı geçti mi — tarayıcı saatine göre; geçtiği an yeniden çizdirir.
 * Sunucu ve hidrasyon çizimi false döner: sunucu zaten yalnız yürürlükteki
 * kampanyayı verir.
 */
function useBittiMi(bitis: string | null): boolean {
  const an = bitis ? Date.parse(bitis) : NaN
  const abone = useCallback(
    (haber: () => void) => {
      if (!Number.isFinite(an)) return () => {}
      const kalan = an - Date.now()
      // setTimeout ~24,8 günden uzun bekleyemez; o kadar uzak bitişte sayfa zaten tazelenir.
      if (kalan <= 0 || kalan > 2_000_000_000) return () => {}
      const zamanlayici = setTimeout(haber, kalan + 50)
      return () => clearTimeout(zamanlayici)
    },
    [an]
  )
  return useSyncExternalStore(abone, () => Number.isFinite(an) && Date.now() >= an, () => false)
}
