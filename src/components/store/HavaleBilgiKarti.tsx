'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

/**
 * Teşekkür sayfasında havale/EFT ödeme bilgileri (7 Kas 2026).
 *
 * Müşterinin bankasına yazacağı üç şey — IBAN, tutar, açıklama — tek
 * dokunuşla kopyalanır. Alıcı adı sitedeki satıcı bilgisiyle aynıdır.
 */
export default function HavaleBilgiKarti(p: {
  siparisNo: string
  tutar: number
  alici: string
  banka: string
  iban: string
}) {
  const [kopyalanan, setKopyalanan] = useState<string | null>(null)
  const kopyala = async (ad: string, deger: string) => {
    try {
      await navigator.clipboard.writeText(deger)
      setKopyalanan(ad)
      setTimeout(() => setKopyalanan(null), 1800)
    } catch {
      /* pano izni yoksa metin zaten seçilebilir */
    }
  }

  const satir = (ad: string, etiket: string, gorunen: string, kopya?: string) => (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0 text-left">
        <p className="text-[10px] uppercase tracking-[0.18em] font-body text-muted">{etiket}</p>
        <p className={`select-all text-ink ${ad === 'iban' ? 'font-mono text-[13px] break-all' : 'font-body text-[15px]'}`}>
          {gorunen}
        </p>
      </div>
      {kopya && (
        <button
          onClick={() => kopyala(ad, kopya)}
          aria-label={`${etiket} kopyala`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] text-ink-soft transition-colors hover:text-accent-deep"
        >
          {kopyalanan === ad ? <Check size={18} className="text-accent-deep" /> : <Copy size={18} />}
        </button>
      )}
    </div>
  )

  return (
    <div className="mb-6 rounded-[4px] border-2 border-ink bg-surface px-5 py-3">
      {satir('tutar', 'Tutar', formatPrice(p.tutar), p.tutar.toFixed(2).replace('.', ','))}
      {satir('alici', 'Alıcı', p.alici)}
      {satir('banka', 'Banka', p.banka)}
      {satir('iban', 'IBAN', p.iban, p.iban.replace(/\s+/g, ''))}
      {satir('aciklama', 'Açıklama', p.siparisNo, p.siparisNo)}
    </div>
  )
}
