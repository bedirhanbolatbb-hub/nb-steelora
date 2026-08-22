import type { SupabaseClient } from '@supabase/supabase-js'
import { sepetiDogrula } from './sepetDogrula'
import { kampanyalariYukle } from './yukle'
import { sepetHesabi, type HesapKampanyasi as HesapKampanyasiTipi, type HesapSonucu, type MusteriDurumu } from './hesap'

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
    /** Kişisel kuponun sahiplik kontrolü için. */
    musteriEpostasi?: string | null
    musteri?: MusteriDurumu
    kargoTutari?: number
    simdi?: Date
  }
): Promise<{
  ozet: HesapSonucu
  kalemler: ReturnType<typeof sepetiDogrula> extends Promise<infer T> ? T extends { kalemler: infer K } ? K : never : never
  kodHatasi: string | null
  kullanilanKampanyaId: string | null
  kisiselKuponId: string | null
}> {
  const dogrulanmis = await sepetiDogrula(supabase, params.items ?? [])
  const { otomatikler, kodlular } = await kampanyalariYukle(supabase, params.simdi ?? new Date())

  // Kod girildiyse yalnız o kod adayları arasına katılır; girilmediyse kodlu
  // kampanyalar hesaba hiç girmez.
  let kodHatasi: string | null = null
  const adaylar = [...otomatikler]

  const temizKod = (params.kod ?? '').trim().toLocaleUpperCase('tr-TR')
  let kisiselKuponId: string | null = null
  let kisiselKuponKampanyaId: string | null = null

  if (temizKod) {
    // 1) Genel kampanya kodu
    const { data: kodSatiri } = await supabase
      .from('campaigns')
      .select('id, code')
      .eq('is_active', true)
      .ilike('code', temizKod)
      .maybeSingle()

    let eslesen = kodSatiri ? kodlular.find((k) => k.id === kodSatiri.id) : null

    // 2) Kişiye özel kupon (ikinci sipariş kuponu gibi) — kuralı şablon
    //    kampanyadan gelir, sahibi e-postaya bağlıdır.
    if (!eslesen) {
      const kisisel = await kisiselKuponBul(supabase, temizKod, params.musteriEpostasi ?? null)
      if (kisisel.hata) {
        kodHatasi = kisisel.hata
      } else if (kisisel.kampanya) {
        eslesen = kisisel.kampanya
        kisiselKuponId = kisisel.kuponId
        kisiselKuponKampanyaId = kisisel.kampanya.id
      }
    }

    if (!eslesen && !kodHatasi) {
      kodHatasi = 'Geçersiz ya da süresi dolmuş kod'
    } else if (eslesen) {
      adaylar.push(eslesen)
    }
  }

  const ozet = sepetHesabi({
    kalemler: dogrulanmis.kalemler,
    kampanyalar: adaylar,
    musteri: params.musteri,
    kargoTutari: params.kargoTutari ?? 0,
  })

  // Kupon gerçekten kazandı mı? (daha yüksek kampanya varsa kupon harcanmaz)
  const kuponUygulandi = Boolean(
    kisiselKuponKampanyaId && ozet.uygulananlar.some((u) => u.kampanyaId === kisiselKuponKampanyaId)
  )

  return {
    ozet,
    kalemler: dogrulanmis.kalemler as any,
    kodHatasi,
    kullanilanKampanyaId: ozet.uygulananlar[0]?.kampanyaId ?? null,
    // Kişisel kupon YALNIZ gerçekten uygulandıysa harcanır; daha yüksek bir
    // kampanya kazandıysa kupon müşterinin cebinde kalır.
    kisiselKuponId: kuponUygulandi ? kisiselKuponId : null,
  }
}

/**
 * Kişiye özel kuponu bulur ve kuralını şablon kampanyadan türetir.
 * Tablo kurulmadıysa sessizce "bulunamadı" döner.
 */
async function kisiselKuponBul(
  supabase: SupabaseClient,
  kod: string,
  eposta: string | null
): Promise<{ kampanya: HesapKampanyasiTipi | null; kuponId: string | null; hata: string | null }> {
  const { data, error } = await supabase
    .from('campaign_coupons')
    .select('id, campaign_id, email, user_id, max_uses, used_count, expires_at, is_active')
    .ilike('code', kod)
    .maybeSingle()

  if (error || !data) return { kampanya: null, kuponId: null, hata: null }
  if (!data.is_active) return { kampanya: null, kuponId: null, hata: 'Bu kupon artık geçerli değil' }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { kampanya: null, kuponId: null, hata: 'Kuponun süresi dolmuş' }
  }
  if ((data.used_count ?? 0) >= (data.max_uses ?? 1)) {
    return { kampanya: null, kuponId: null, hata: 'Bu kupon daha önce kullanılmış' }
  }
  // Sahiplik: kupon kişiye özel; hangi adrese ait olduğu SÖYLENMEZ.
  const sahip = (data.email ?? '').trim().toLocaleLowerCase('tr-TR')
  const veren = (eposta ?? '').trim().toLocaleLowerCase('tr-TR')
  if (sahip && veren && sahip !== veren) {
    return { kampanya: null, kuponId: null, hata: 'Bu kupon başka bir hesaba tanımlı' }
  }
  if (sahip && !veren) {
    return { kampanya: null, kuponId: null, hata: 'Kuponu kullanmak için e-posta adresinizi girin' }
  }

  const { data: sablon } = await supabase
    .from('campaigns')
    .select('id, name, discount_type, discount_value, min_cart_amount')
    .eq('id', data.campaign_id)
    .maybeSingle()
  if (!sablon) return { kampanya: null, kuponId: null, hata: 'Kupon tanımı bulunamadı' }

  return {
    kuponId: data.id,
    hata: null,
    kampanya: {
      id: sablon.id,
      ad: sablon.name,
      tip: (sablon.discount_type ?? 'percent') === 'fixed' ? 'sepet_sabit' : 'sepet_yuzde',
      kapsam: 'sepet',
      hedefler: [],
      deger: Number(sablon.discount_value) || 0,
      minSepet: Number(sablon.min_cart_amount ?? 0),
      minAdet: 0,
      alAdet: null,
      odeAdet: null,
      kademeler: null,
      birlesebilir: false,
      oncelik: 100,
      ilkAlisverisMi: false,
      sadeceUyelere: false,
      koduVar: true,
    },
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
