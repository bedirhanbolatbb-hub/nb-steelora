import NotFoundContent from '@/components/store/NotFoundContent'

/**
 * Faz 27: CSP nonce'u ancak dinamik üretilen sayfalara işlenebiliyor.
 * Bu sayfa statik ön üretiliyordu; nonce'suz script etiketleriyle birlikte
 * nonce'lu bir politika alınca TÜM script'leri engellenirdi (yerelde
 * ölçüldü: 19 script, 0 nonce). Dinamikleştirmenin maliyeti yok — sayfa
 * seyrek açılıyor ve zaten istemci bileşeni.
 */
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Sayfa bulunamadı' }

// Hiçbir rotaya uymayan adresler için kök 404.
export default function NotFound() {
  return <NotFoundContent />
}
