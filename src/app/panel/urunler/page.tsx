import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Ürünler' }

export default function UrunlerPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Ürünler yakında"
        description="Ürün düzenleme, rozet ve vitrin alanları bu bölümde yönetilecek (Faz 7C)."
      />
    </div>
  )
}
