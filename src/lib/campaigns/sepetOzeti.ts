import type { SupabaseClient } from '@supabase/supabase-js'
import { sepetiDogrula } from './sepetDogrula'
import { kampanyalariYukle } from './yukle'
import { sepetHesabi, type HesapSonucu, type MusteriDurumu } from './hesap'

/**
 * Sepet özetinin TEK kaynağı (Faz 17).
 *
 * Ödeme başlatma ucu, sepet/ödeme ekranının çağırdığı uç ve panel önizlemesi
 * aynı fonksiyonu çağırır. Faz 15'te bulunan kusurun (ekranda bir tutar,
 * tahsilatta başka tutar) tekrar etmemesi bu tekliğe bağlı; istemci artık
 * indirim hesabı yapmaz, yalnız buradan geleni gösterir.
 */
export async function sepetOzetiHesapla(
  supabase: SupabaseClient,
  params: {
    items: { productId?: string; quantity?: number; price?: number }[]
    kod?: string | null
    musteri?: MusteriDurumu
    kargoTutari?: number
    simdi?: Date
  }
): Promise<{
  ozet: HesapSonucu
  kalemler: ReturnType<typeof sepetiDogrula> extends Promise<infer T> ? T extends { kalemler: infer K } ? K : never : never
  kodHatasi: string | null
  kullanilanKampanyaId: string | null
}> {
  const dogrulanmis = await sepetiDogrula(supabase, params.items ?? [])
  const { otomatikler, kodlular } = await kampanyalariYukle(supabase, params.simdi ?? new Date())

  // Kod girildiyse yalnız o kod adayları arasına katılır; girilmediyse kodlu
  // kampanyalar hesaba hiç girmez.
  let kodHatasi: string | null = null
  const adaylar = [...otomatikler]

  const temizKod = (params.kod ?? '').trim().toLocaleUpperCase('tr-TR')
  if (temizKod) {
    const { data: kodSatiri } = await supabase
      .from('campaigns')
      .select('id, code')
      .eq('is_active', true)
      .ilike('code', temizKod)
      .maybeSingle()

    const eslesen = kodSatiri ? kodlular.find((k) => k.id === kodSatiri.id) : null
    if (!eslesen) {
      kodHatasi = 'Geçersiz ya da süresi dolmuş kod'
    } else {
      adaylar.push(eslesen)
    }
  }

  const ozet = sepetHesabi({
    kalemler: dogrulanmis.kalemler,
    kampanyalar: adaylar,
    musteri: params.musteri,
    kargoTutari: params.kargoTutari ?? 0,
  })

  return {
    ozet,
    kalemler: dogrulanmis.kalemler as any,
    kodHatasi,
    kullanilanKampanyaId: ozet.uygulananlar[0]?.kampanyaId ?? null,
  }
}

/** Müşterinin ilk alışveriş / üyelik durumu — koşullu kampanyalar için. */
export async function musteriDurumu(
  supabase: SupabaseClient,
  params: { userId?: string | null; eposta?: string | null }
): Promise<MusteriDurumu> {
  const uyeMi = Boolean(params.userId)
  let oncekiTeslimatVar = false

  try {
    // "İlk alışveriş" ölçütü teslim edilmiş sipariş: iptal edilmiş ya da
    // yolda olan sipariş kişiyi ilk alışveriş hakkından etmemeli.
    let sorgu = supabase.from('orders').select('id').eq('status', 'delivered').limit(1)
    if (params.userId) sorgu = sorgu.eq('user_id', params.userId)
    else if (params.eposta) sorgu = sorgu.ilike('guest_email', params.eposta.trim())
    else return { uyeMi, oncekiTeslimatVar: false }

    const { data } = await sorgu
    oncekiTeslimatVar = Boolean(data?.length)
  } catch {
    // Sorgu başarısızsa müşteri lehine davran: ilk alışveriş sayılır.
  }

  return { uyeMi, oncekiTeslimatVar }
}
