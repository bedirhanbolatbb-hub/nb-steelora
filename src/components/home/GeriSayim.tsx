'use client'

import { useEffect, useState } from 'react'

/**
 * Kampanya bitişine kalan süre (Faz 11A).
 *
 * Bitiş tarihi KAMPANYA KAYDINDAN gelir (campaigns.ends_at); kodda sabit
 * tarih yok. Kampanya bitince `vitrinIndirimiGetir()` zaten null döner ve
 * bandın tamamı basılmaz — geri sayım "00:00"da takılı kalmaz.
 *
 * Dakikada bir güncellenir: saniye göstermek aciliyet üretir, marka sesi
 * belgesi baskı dilini yasaklıyor. Amaç telaş değil bilgi.
 *
 * `prefers-reduced-motion` açıkken de çalışır ama METİN olarak — burada
 * animasyon yok zaten, yalnız sayı değişiyor; hareket duyarlılığı olan
 * kullanıcı için de sorun çıkarmaz.
 */
export default function GeriSayim({ bitis }: { bitis: string }) {
  const [kalan, setKalan] = useState<string | null>(null)

  useEffect(() => {
    const hesapla = () => {
      const fark = new Date(bitis).getTime() - Date.now()
      if (!Number.isFinite(fark) || fark <= 0) {
        setKalan(null)
        return
      }
      const gun = Math.floor(fark / 86_400_000)
      const saat = Math.floor((fark % 86_400_000) / 3_600_000)
      const dakika = Math.floor((fark % 3_600_000) / 60_000)
      // Son bir saatte dakika, öncesinde gün+saat: uzaktan bakanın işine
      // yarayan çözünürlük farklı.
      if (gun > 0) setKalan(`${gun} gün ${saat} saat kaldı`)
      else if (saat > 0) setKalan(`${saat} saat ${dakika} dakika kaldı`)
      else setKalan(`${dakika} dakika kaldı`)
    }
    hesapla()
    const t = setInterval(hesapla, 60_000)
    return () => clearInterval(t)
  }, [bitis])

  // Sunucuda ve süre dolduğunda hiçbir şey basılmaz.
  if (!kalan) return null

  return (
    <span className="font-body text-[11px] tracking-[0.08em] text-ink-soft tabular-nums">
      {kalan}
    </span>
  )
}
