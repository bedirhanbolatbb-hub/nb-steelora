'use client'

import { createContext, useContext } from 'react'
import type { UyelikTesviki } from '@/lib/campaigns/uyelikTesviki'

/**
 * "Üye olursanız %X indirim" bilgisini kabuk boyunca taşır (Faz 11E).
 *
 * KampanyaSaglayici ile aynı desen: veri sunucuda BİR kez okunur, istemci
 * bileşenleri (kayıt sayfası, sepet, ödeme) ek istek yapmadan okur. Aktif
 * "yalnız üyelere" kampanya yoksa değer null'dır ve hiçbir yerde hiçbir şey
 * basılmaz.
 */
const Baglam = createContext<UyelikTesviki | null>(null)

export function UyelikTesvikSaglayici({
  tesvik,
  children,
}: {
  tesvik: UyelikTesviki | null
  children: React.ReactNode
}) {
  return <Baglam.Provider value={tesvik}>{children}</Baglam.Provider>
}

export function useUyelikTesviki() {
  return useContext(Baglam)
}
