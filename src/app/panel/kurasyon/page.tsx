import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Kürasyon' }

export default function KurasyonPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Kürasyon yakında"
        description="Anasayfa hero, öne çıkanlar ve kategori görselleri buradan seçilecek (Faz 7C)."
      />
    </div>
  )
}
