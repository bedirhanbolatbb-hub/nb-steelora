'use client'

import { useEffect, useState } from 'react'
import { tariheKadar } from '@/lib/metin/ekler'

/** Geri sayım yalnız bu eşiğin altında görünür (Faz 11A-FIX · F2). */
const SON_GUNLER = 7 * 86_400_000

/**
 * Kampanya bitişine kalan süre (Faz 11A).
 *
 * Bitiş tarihi KAMPANYA KAYDINDAN gelir (campaigns.ends_at); kodda sabit
 * tarih yok. Kampanya bitince `vitrinIndirimiGetir()` zaten null döner ve
 * bandın tamamı basılmaz — geri sayım "00:00"da takılı kalmaz.
 *
 * Faz 11A-FIX (F2): geri sayım SON YEDİ GÜNDE başlar. Öncesinde bitiş tarihi
 * yazılır ("30 Eylül'e kadar"). Sebep: aylar öncesinden "26 gün kaldı" yazmak
 * bilgi değil baskıdır ve marka sesi belgesi uydurma aciliyeti yasaklıyor.
 * Tarih de sayı da aynı kayıttan gelir; kodda sabit tarih YOK.
 *
 * Dakikada bir güncellenir: saniye göstermek aciliyet üretir. Amaç telaş
 * değil bilgi.
 */
export default function GeriSayim({ bitis }: { bitis: string }) {
  const [kalan, setKalan] = useState<string | null>(null)
  const [bitti, setBitti] = useState(false)

  useEffect(() => {
    const hesapla = () => {
      const fark = new Date(bitis).getTime() - Date.now()
      if (!Number.isFinite(fark) || fark <= 0) {
        setBitti(true)
        setKalan(null)
        return
      }
      // Yedi günden uzaksa sayaç yok; tarih metni basılı kalır.
      if (fark > SON_GUNLER) {
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

  const gecerli = Number.isFinite(new Date(bitis).getTime())
  if (!gecerli || bitti) return null

  return (
    <span className="font-body text-[11px] tracking-[0.08em] text-ink-soft tabular-nums">
      {kalan ?? tariheKadar(bitis)}
    </span>
  )
}
