import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Site Metinleri' }

export default function SiteMetinleriPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Site Metinleri yakında"
        description="Duyuru şeridi, hero metinleri ve site içerikleri buradan güncellenecek (Faz 7D)."
      />
    </div>
  )
}
