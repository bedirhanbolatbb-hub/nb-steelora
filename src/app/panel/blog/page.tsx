import type { Metadata } from 'next'
import { PEmptyState } from '../_components/ui'

export const metadata: Metadata = { title: 'Blog' }

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PEmptyState
        title="Blog yakında"
        description="Yazı düzenleme ve kapak görselleri bu bölümde yönetilecek (Faz 7D)."
      />
    </div>
  )
}
