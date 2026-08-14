import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Kampanyalar' }

export default function KampanyalarPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Kampanyalar yakında"
        description="İndirim kodları ve kampanya yönetimi bu bölüme gelecek (Faz 7D)."
      />
    </div>
  )
}
