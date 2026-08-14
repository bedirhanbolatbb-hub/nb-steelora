import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Siparişler' }

export default function SiparislerPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Siparişler yakında"
        description="Sipariş listesi, durum akışı ve müşteri talepleri bu bölümde toplanacak (Faz 7B)."
      />
    </div>
  )
}
