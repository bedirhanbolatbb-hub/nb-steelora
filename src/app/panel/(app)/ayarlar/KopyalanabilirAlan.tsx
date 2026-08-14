'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { PButton, PInput } from '../_components/ui'

export default function KopyalanabilirAlan({ deger }: { deger: string }) {
  const [kopyalandi, setKopyalandi] = useState(false)

  return (
    <div className="flex gap-2">
      <PInput value={deger} readOnly onFocus={(e) => e.currentTarget.select()} />
      <PButton
        variant="ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(deger)
          setKopyalandi(true)
          setTimeout(() => setKopyalandi(false), 1500)
        }}
      >
        {kopyalandi ? <Check size={14} className="text-[var(--p-success)]" /> : <Copy size={14} />}
        {kopyalandi ? 'Kopyalandı' : 'Kopyala'}
      </PButton>
    </div>
  )
}
