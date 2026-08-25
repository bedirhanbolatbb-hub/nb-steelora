'use client'

import { create } from 'zustand'

/**
 * Sepet panelinin açık/kapalı durumu (Faz 11A).
 *
 * KUSUR: ürün sepete eklendiğinde hiçbir şey açılmıyordu. Müşteri "Sepete
 * Eklendi" yazısını görüyor, sonra ne yapacağını kendisi bulmak zorunda
 * kalıyordu — üstteki sepet ikonuna tıklamak ya da /sepet'e gitmek. Ödemeye
 * giden yol her seferinde müşterinin kendi çabasına bırakılmıştı.
 *
 * Durum Navbar'ın YEREL state'indeydi, o yüzden ürün sayfası ve kartlar
 * paneli açamıyordu. Ortak bir duruma taşındı; Navbar da bunu okuyor.
 *
 * Panel KENDİLİĞİNDEN KAPANMAZ: müşteri "Ödemeye geç" ya da kapat demeden
 * kapanmaz. Kendiliğinden kapanan panel, kararı yine müşteriye havale eder.
 */
type SepetPaneli = {
  acik: boolean
  ac: () => void
  kapat: () => void
}

export const useSepetPaneli = create<SepetPaneli>((set) => ({
  acik: false,
  ac: () => set({ acik: true }),
  kapat: () => set({ acik: false }),
}))
