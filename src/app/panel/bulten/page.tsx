import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Bülten' }

export default function BultenPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Bülten yakında"
        description="Bülten aboneleri ve dışa aktarma bu bölümde listelenecek (Faz 7D)."
      />
    </div>
  )
}
