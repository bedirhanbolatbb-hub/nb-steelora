import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'
import { sepetOzetiHesapla, musteriDurumu } from '@/lib/campaigns/sepetOzeti'
import { ilkSiparisDuyurusu } from '@/lib/campaigns/ilkSiparisKuponu'

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
  // Faz 27: kalıcı hız sınırı (bkz. lib/guvenlik/hizSiniri.ts).
  const _sinir = await hizSiniri(`sepet-ozeti:${istekKimligi(request)}`, 300, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

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
      ilkSiparisMetni: (await ilkSiparisDuyurusu())?.sepet ?? null,
    })
  }

  const supabase = createServiceClient()
  const musteri = await musteriDurumu(supabase, {
    userId: typeof body?.userId === 'string' ? body.userId : null,
    eposta: typeof body?.eposta === 'string' ? body.eposta : null,
  })

  const { ozet, kodHatasi, kuponDurumu } = await sepetOzetiHesapla(supabase, {
    items,
    kod,
    // Kişiye özel kuponun sahiplik kontrolü için: kupon yalnız kendi
    // adresinde çalışır.
    musteriEpostasi: typeof body?.eposta === 'string' ? body.eposta : null,
    musteri,
  })
  // Kupon kutusunun altında gösterilecek hatırlatma. Otomatik bir vitrin
  // kampanyası varken null döner — müşteriyi daha kötü olan kodu girmeye
  // davet etmemek için (indirimler birleşmiyor, motor en yükseğini uyguluyor).
  const duyuru = await ilkSiparisDuyurusu()

  return NextResponse.json({
    ozet,
    kodHatasi,
    // Ekran mesajın TONUNU buradan öğrenir: "daha avantajlı kampanya var"
    // kırmızı basılmamalı, o iyi haber (Faz 25).
    kuponDurumu,
    ilkSiparisMetni: duyuru?.sepet ?? null,
  })
}
