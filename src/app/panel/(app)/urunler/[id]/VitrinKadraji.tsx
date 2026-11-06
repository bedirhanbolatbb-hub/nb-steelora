'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PBadge, PButton, PCard } from '../../_components/ui'
import { useToast } from '../../_components/overlays'
import { gorselBoyutu, trendyolCdnMi } from '@/lib/images'
import { kadrajAdresi } from '@/lib/gorsel/kadraj'

/**
 * Vitrin kadrajı — ürün başına (Faz 35).
 *
 * Kart görseli fotoğraftaki takıya göre otomatik kadrajlanır. Otomatik kırpım
 * bir üründe yanlış oturursa (ürünün bir kısmı dışarıda kalırsa) BB buradan o
 * ürünü eski ortadan kırpıma döndürür. Önizleme vitrindeki kartla aynı adresi
 * kullanır — burada ne görülüyorsa vitrinde o vardır.
 */
export default function VitrinKadraji({
  urunId,
  gorsel,
  genelAcik,
  urundeKapali,
}: {
  urunId: string
  gorsel: string | null
  genelAcik: boolean
  urundeKapali: boolean
}) {
  const router = useRouter()
  const { push: toast } = useToast()
  const [kapali, setKapali] = useState(urundeKapali)
  const [isleniyor, setIsleniyor] = useState(false)

  const degistir = async () => {
    setIsleniyor(true)
    try {
      const res = await fetch('/api/panel/kadraj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urunId, kapali: !kapali }),
      })
      const d = await res.json()
      if (!res.ok || !d?.ok) throw new Error(d?.error || 'Kaydedilemedi')
      setKapali(!kapali)
      toast(!kapali ? 'Bu üründe kadraj kapatıldı' : 'Bu üründe kadraj açıldı', 'success')
      router.refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Kaydedilemedi', 'danger')
    }
    setIsleniyor(false)
  }

  const trendyol = gorsel && trendyolCdnMi(gorsel)

  return (
    <PCard
      title="Vitrin kadrajı"
      action={
        !genelAcik ? (
          <PBadge tone="neutral">Tüm vitrinde kapalı</PBadge>
        ) : kapali ? (
          <PBadge tone="warning">Bu üründe kapalı</PBadge>
        ) : (
          <PBadge tone="success">Açık</PBadge>
        )
      }
    >
      {!trendyol ? (
        <p className="text-[13px] text-[var(--p-muted)]">
          Bu ürünün ilk görseli panelden yüklenmiş; yüklediğiniz görsel olduğu gibi gösterilir.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[13px] leading-relaxed text-[var(--p-ink-soft)]">
            Kartta ürün, fotoğraftaki takıya göre yakınlaştırılarak gösterilir. Ürünün bir kısmı
            dışarıda kalıyorsa bu üründe kapatın; kart eski kadrajına döner.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gorselBoyutu(gorsel, 384)} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <figcaption className="mt-1 text-center text-[11px] text-[var(--p-muted)]">Eski kadraj</figcaption>
            </figure>
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--p-bg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kadrajAdresi(gorsel, 384, '45')} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <figcaption className="mt-1 text-center text-[11px] text-[var(--p-muted)]">Yeni kadraj</figcaption>
            </figure>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PButton variant={kapali ? 'primary' : 'ghost'} onClick={degistir} disabled={isleniyor}>
              {isleniyor ? 'Kaydediliyor…' : kapali ? 'Bu üründe kadrajı aç' : 'Bu üründe kadrajı kapat'}
            </PButton>
            <span className="text-[11px] text-[var(--p-muted)]">Vitrine en geç 2 dakikada yansır.</span>
          </div>
        </>
      )}
    </PCard>
  )
}
