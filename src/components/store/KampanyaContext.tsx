'use client'

import { createContext, useContext } from 'react'
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
  return <Kampanya.Provider value={indirim}>{children}</Kampanya.Provider>
}

export function useVitrinIndirimi() {
  return useContext(Kampanya)
}
