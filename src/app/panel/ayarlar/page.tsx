import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Ayarlar' }

export default function AyarlarPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Ayarlar yakında"
        description="Kargo eşiği ve panel tercihleri gibi ayarlar burada toplanacak."
      />
    </div>
  )
}
