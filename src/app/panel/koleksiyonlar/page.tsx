import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Koleksiyonlar' }

export default function KoleksiyonlarPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Koleksiyonlar yakında"
        description="Koleksiyon oluşturma ve ürün atama buradan yapılacak (Faz 7C)."
      />
    </div>
  )
}
