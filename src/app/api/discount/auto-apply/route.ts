import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sepetOzetiHesapla, musteriDurumu } from '@/lib/campaigns/sepetOzeti'

export const dynamic = 'force-dynamic'

/**
 * Sepet özetinin tek ucu (Faz 17'de yeniden yazıldı).
 *
 * Eskiden istemci sepet tutarını ve fiyat listesini kendisi gönderiyor, kampanya
 * seçimini de kendi kodunda tekrarlıyordu; ödeme ekranı `quantity` bilgisini hiç
 * taşımadığı için X al Y öde gibi kampanyalarda ekran ile tahsilat ayrışıyordu.
 * Artık istemciden yalnız "hangi üründen kaç adet" ve varsa kupon kodu gelir;
 * fiyat, kampanya seçimi, tavan ve toplam sunucuda hesaplanır.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const items = Array.isArray(body?.items) ? body.items : []
  const kod = typeof body?.kod === 'string' ? body.kod : null

  if (items.length === 0) {
    return NextResponse.json({
      ozet: {
        araToplam: 0,
        uygulananlar: [],
        indirimToplami: 0,
        tavanUygulandi: false,
        tavanTutari: 0,
        ucretsizKargo: false,
        yaklasanlar: [],
        toplam: 0,
      },
      kodHatasi: null,
    })
  }

  const supabase = createServiceClient()
  const musteri = await musteriDurumu(supabase, {
    userId: typeof body?.userId === 'string' ? body.userId : null,
    eposta: typeof body?.eposta === 'string' ? body.eposta : null,
  })

  const { ozet, kodHatasi } = await sepetOzetiHesapla(supabase, {
    items,
    kod,
    // Kişiye özel kuponun sahiplik kontrolü için: kupon yalnız kendi
    // adresinde çalışır.
    musteriEpostasi: typeof body?.eposta === 'string' ? body.eposta : null,
    musteri,
  })
  return NextResponse.json({ ozet, kodHatasi })
}
