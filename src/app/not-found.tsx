import NotFoundContent from '@/components/store/NotFoundContent'
import StoreLayout from './(store)/layout'

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
//
// 24 Kas 2026 tasarım denetimi: bu sayfa mağaza kabuğunun DIŞINDA kalıyordu —
// başlık, menü, arama ve alt bilgi yoktu; yanlış adrese düşen ziyaretçinin
// elinde yalnız ortadaki düğmeler kalıyordu. Kabuk (app/(store)/layout)
// burada da kullanılır; verisi süreç içi önbellekten gelir.
export default function NotFound() {
  return (
    <StoreLayout>
      <NotFoundContent />
    </StoreLayout>
  )
}
