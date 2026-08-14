import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Yorumlar' }

export default function YorumlarPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Yorumlar yakında"
        description="Yorum onaylama ve yanıtlama araçları bu bölüme taşınacak (Faz 7B)."
      />
    </div>
  )
}
