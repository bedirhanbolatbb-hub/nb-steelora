import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { filtreIcinTemizle } from '@/lib/guvenlik/girdi'
import { FILTRE_KATEGORILERI, filtreDesenleri } from '@/lib/catalog/categories'
import { fiyatKovalari } from '@/lib/catalog/fiyatKovalari'
import ProductsClient from '@/components/store/ProductsClient'
import JsonLd from '@/components/seo/JsonLd'
import KirintiYolu from '@/components/seo/KirintiYolu'
import { webPageJsonLd } from '@/lib/seo'
import { LISTING_COLUMNS, PER_PAGE, paginateGroupedProducts } from '@/lib/catalog/listing'
import { getSiteContent } from '@/lib/supabase/content'

/**
 * Katalog sayfasının KENDİ metadata'sı yoktu: başlığı da açıklaması da kök
 * layout'tan geliyordu, yani arama sonucunda ana sayfayla birebir aynı metni
 * gösteriyordu (Faz 11F kapanış denetimi). Filtre/sayfa parametreleri de
 * kanonik adresi çoğaltıyordu; canonical filtresiz katalogu işaret eder.
 */
/** Meta açıklaması ile CollectionPage şeması aynı cümleyi taşır. */
const KATALOG_ACIKLAMA =
  'NB Steelora kataloğunun tamamı: 316L paslanmaz çelik kolye, küpe, bileklik, yüzük, piercing ve setler. Kategori, fiyat ve renge göre süzün.'

export const metadata: Metadata = {
  title: 'Tüm Ürünler',
  description: KATALOG_ACIKLAMA,
  alternates: { canonical: '/urunler' },
}

export default async function UrunlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const icerik = await getSiteContent()

  // Sayfalama gruplandıktan sonra uygulanır — bkz. lib/catalog/listing.ts
  let query = supabase
    .from('products_display')
    .select(LISTING_COLUMNS)

  // Kategori filtresi
  if (params.kategori) {
    // Faz 11A: filtre artık MARKA adı taşıyor ("Bileklik"); Trendyol'un ham
    // kategorisi farklı olabiliyor ("Çelik Halhal"). Marka adı desenlere
    // çevrilip hepsi eşleştirilir.
    const desenler = filtreDesenleri(params.kategori)
    query = query.or(
      desenler.map((d) => `trendyol_category.ilike.%${filtreIcinTemizle(d)}%`).join(',')
    )
  }

  // Fiyat aralığı
  if (params.min_fiyat) {
    query = query.gte('display_price', parseFloat(params.min_fiyat))
  }
  if (params.max_fiyat) {
    query = query.lte('display_price', parseFloat(params.max_fiyat))
  }

  // Stok filtresi
  if (params.stok === '1') {
    query = query.gt('trendyol_stock', 0)
  }

  // Sıralama
  switch (params.siralama) {
    case 'fiyat-artan':
      query = query.order('display_price', { ascending: true })
      break
    case 'fiyat-azalan':
      query = query.order('display_price', { ascending: false })
      break
    case 'yeni':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  }

  const sayfa = parseInt(params.sayfa || '1')
  const { data: products } = await query
  const { cards, total } = paginateGroupedProducts((products || []) as any[], sayfa)

  /**
   * Faz 11A: filtre listesi TRENDYOL'un ham kategori adlarını basıyordu
   * ("316L Çelik Kolye", "Bijuteri Küpe" gibi 20+ satır). Müşteri menüde
   * "Kolye" görürken filtrede başka bir sözlükle karşılaşıyordu.
   * Artık menüdeki marka taksonomisi kullanılır; ham ad hiç görünmez.
   *
   * Halhal menüde yok ama katalogda var — filtrede görünmesi gerekiyor.
   */
  const categories = FILTRE_KATEGORILERI.map((k) => k.title)

  /**
   * Fiyat kovaları GÖSTERİLEN fiyatların gerçek min/max'ından türer.
   * Sabit kovaların üçü boştu (0-200, 500-1000, 1000+) çünkü katalog
   * 279-649 ₺ bandında. Kampanya bitince de kendiliğinden doğru kalır.
   */
  const tumFiyatlar = (products || [])
    .map((p: any) => Number(p.display_price) || 0)
    .filter((n) => n > 0)
  const fiyatAraliklari = fiyatKovalari(tumFiyatlar)

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          tip: 'CollectionPage',
          ad: 'Tüm Ürünler',
          aciklama: KATALOG_ACIKLAMA,
          path: '/urunler',
        })}
      />
      <ProductsClient
      ustSerit={
        <KirintiYolu
          adimlar={[
            { ad: 'Ana Sayfa', path: '/' },
            { ad: 'Tüm Ürünler', path: '/urunler' },
          ]}
        />
      }
      cards={cards}
      total={total}
      categories={categories}
      fiyatAraliklari={fiyatAraliklari}
      currentPage={sayfa}
      perPage={PER_PAGE}
      currentParams={{
        kategori: params.kategori || '',
        siralama: params.siralama || '',
        min_fiyat: params.min_fiyat || '',
        max_fiyat: params.max_fiyat || '',
        stok: params.stok || '',
      }}
        tanitim={icerik['kategori_tanitim_tum-urunler'] || undefined}
      />
    </>
  )
}
