'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'

/**
 * Vitrin kadrajı bağlamı (Faz 35). Ayar vitrin kabuğunda bir kez okunur
 * (layout → lib/gorsel/kadrajAyari) ve kartlara buradan dağıtılır.
 * Sağlayıcı yoksa (panel, e-posta önizlemesi) kadraj KAPALI sayılır.
 */
type Deger = { acik: boolean; kapali: ReadonlySet<string> }
const Baglam = createContext<Deger>({ acik: false, kapali: new Set() })

export function KadrajSaglayici({
  acik,
  kapaliIdler,
  children,
}: {
  acik: boolean
  kapaliIdler: string[]
  children: React.ReactNode
}) {
  const anahtar = kapaliIdler.join(',')
  const deger = useMemo(
    () => ({ acik, kapali: new Set(anahtar ? anahtar.split(',') : []) }),
    [acik, anahtar]
  )
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}

/** Bu ürünün kart görseli kadrajlansın mı? */
export function useKadraj(urunId: string | null | undefined): boolean {
  const b = useContext(Baglam)
  return b.acik && Boolean(urunId) && !b.kapali.has(urunId as string)
}

/** Liste içinde (sepet satırları) ürün başına sormak için. */
export function useKadrajSorgu(): (urunId: string | null | undefined) => boolean {
  const b = useContext(Baglam)
  return useCallback((id) => b.acik && Boolean(id) && !b.kapali.has(id as string), [b])
}

/** Ürüne bağlı olmayan görseller (kategori kapağı) için genel anahtar. */
export function useKadrajGenel(): boolean {
  return useContext(Baglam).acik
}
