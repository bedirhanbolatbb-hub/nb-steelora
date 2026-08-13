import NotFoundContent from '@/components/store/NotFoundContent'

export const metadata = { title: 'Sayfa bulunamadı' }

// Mağaza içi 404 (ör. /urun/[slug] notFound()) — navbar ve footer korunur.
export default function StoreNotFound() {
  return <NotFoundContent />
}
