'use client'

import { useState } from 'react'
import { PBadge, PButton, PCard } from '../_components/ui'
import { useToast } from '../_components/overlays'

/**
 * Vitrin kadrajı — genel anahtar (Faz 35). Ürün başına kapatma ürün
 * detayındaki "Vitrin kadrajı" kartında.
 */
export default function VitrinKadrajiGenel({ acik: ilk, kapaliSayisi }: { acik: boolean; kapaliSayisi: number }) {
  const { push: toast } = useToast()
  const [acik, setAcik] = useState(ilk)
  const [isleniyor, setIsleniyor] = useState(false)

  const degistir = async () => {
    setIsleniyor(true)
    try {
      const res = await fetch('/api/panel/kadraj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genel: acik ? 'kapali' : 'acik' }),
      })
      const d = await res.json()
      if (!res.ok || !d?.ok) throw new Error(d?.error || 'Kaydedilemedi')
      setAcik(!acik)
      toast(!acik ? 'Vitrin kadrajı açıldı' : 'Vitrin kadrajı kapatıldı', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Kaydedilemedi', 'danger')
    }
    setIsleniyor(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PCard
        title="Vitrin kadrajı"
        action={acik ? <PBadge tone="success">Açık</PBadge> : <PBadge tone="neutral">Kapalı</PBadge>}
      >
        <p className="text-[13px] leading-relaxed text-[var(--p-ink-soft)]">
          Ürün kartlarında takı, fotoğraftaki yerine göre yakınlaştırılarak gösterilir; saten zemin
          yerine ürün öne çıkar. Ürün sayfasındaki büyük galeri değişmez.
          {kapaliSayisi > 0 && ` ${kapaliSayisi} üründe ürün sayfasından kapatıldı.`}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <PButton variant={acik ? 'ghost' : 'primary'} onClick={degistir} disabled={isleniyor}>
            {isleniyor ? 'Kaydediliyor…' : acik ? 'Tüm vitrinde kapat' : 'Tüm vitrinde aç'}
          </PButton>
          <span className="text-[11px] text-[var(--p-muted)]">Vitrine en geç 2 dakikada yansır.</span>
        </div>
      </PCard>
    </div>
  )
}
