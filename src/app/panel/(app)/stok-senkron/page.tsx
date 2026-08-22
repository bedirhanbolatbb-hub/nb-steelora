import type { Metadata } from 'next'
import { sonYazimlar, basarisizSayisi } from '@/lib/trendyol/stokKuyrugu'
import { stokYazimModu } from '@/lib/trendyol/stokYazimBayragi'
import StokSenkronClient from './StokSenkronClient'

export const metadata: Metadata = { title: 'Stok senkronu' }
export const dynamic = 'force-dynamic'

/**
 * Trendyol stok yazımının izlenebildiği ekran (Faz 16B).
 * Gölge modda "yazılacaktı" kayıtları da burada görünür.
 */
export default async function StokSenkronPage() {
  const [{ kayitlar, tabloYok }, basarisiz] = await Promise.all([sonYazimlar(50), basarisizSayisi()])

  return (
    <StokSenkronClient
      mod={stokYazimModu()}
      tabloYok={tabloYok}
      basarisiz={basarisiz}
      kayitlar={(kayitlar as any[]).map((k) => ({
        id: String(k.id),
        zaman: k.occurred_at,
        barkod: k.barcode,
        mod: k.mode,
        oncekiDeger: k.previous_quantity,
        yazilanDeger: k.written_quantity,
        delta: k.delta,
        batch: k.batch_request_id,
        durum: k.item_status,
        hata: k.error,
      }))}
    />
  )
}
