import NotFoundContent from '@/components/store/NotFoundContent'

export const metadata = { title: 'Sayfa bulunamadı' }

// Hiçbir rotaya uymayan adresler için kök 404.
export default function NotFound() {
  return <NotFoundContent />
}
