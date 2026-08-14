import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Senkron' }

export default function SenkronPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Senkron yakında"
        description="Koşu geçmişi ve elle tetikleme bu bölümde olacak (Faz 7B)."
      />
    </div>
  )
}
