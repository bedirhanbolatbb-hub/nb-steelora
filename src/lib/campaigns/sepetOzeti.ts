import type { SupabaseClient } from '@supabase/supabase-js'
import { sepetiDogrula } from './sepetDogrula'
import { kampanyalariYukle } from './yukle'
import { sepetHesabi, kampanyaUygunMu, type HesapKampanyasi as HesapKampanyasiTipi, type HesapSonucu, type MusteriDurumu } from './hesap'
import { kuponMesaji, type KuponDurumu } from './kuponMesaji'

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
  /** Kupon kutusunun durumu — ekranlar mesajı buradan basar (Faz 25). */
  kuponDurumu: KuponDurumu | null
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

  // Kupon kutusunun ne diyeceğini belirleyen durum (Faz 25). Sepet ve ödeme
  // adımı aynı cümleyi bassın diye kararı BURASI verir, ekranlar değil.
  let kuponDurumu: KuponDurumu | null = null
  let eslesenKampanya: HesapKampanyasiTipi | null = null

  if (temizKod) {
    // 1) Genel kampanya kodu. Tarih/aktiflik SÜZMEDEN okunur: "süresi dolmuş"
    //    ile "böyle bir kod yok" arasındaki farkı ancak böyle söyleyebiliriz.
    const { data: kodSatiri } = await supabase
      .from('campaigns')
      .select('id, code, is_active, starts_at, ends_at')
      // Faz 27: `ilike` joker kabul eder — `NB%` gibi bir önekle kod uzayı
      // daraltılarak yayınlanmamış kodlar keşfedilebiliyordu. Kod zaten
      // toLocaleUpperCase ile normalize ediliyor, tam eşleşme yeterli.
      .eq('code', temizKod)
      .maybeSingle()

    let eslesen = kodSatiri ? kodlular.find((k) => k.id === kodSatiri.id) : null

    // Zaten OTOMATİK uygulanan bir kampanyanın kodunu yazmak hata değildir.
    // NB30 kod gerektirmeyen bir kampanya (requires_code=false) ama reklamda
    // "NB30" yazdığı için müşteri kutuya giriyordu; kod `kodlular` listesinde
    // olmadığından "Geçersiz ya da süresi dolmuş kod" dönüyor, ödeme ucu da
    // bunu 400'e çevirip siparişi kesiyordu — indirim zaten uygulanmışken
    // müşteri ödeme yapamıyordu (Faz 19 ölçümü).
    const zatenOtomatik = kodSatiri ? otomatikler.some((k) => k.id === kodSatiri.id) : false

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

    if (eslesen) {
      adaylar.push(eslesen)
      eslesenKampanya = eslesen
    } else if (zatenOtomatik) {
      kuponDurumu = { tip: 'zaten_otomatik' }
    } else if (kodSatiri) {
      // Kod var ama yürürlükte değil — hangisi?
      const simdi = params.simdi ?? new Date()
      const bitti = kodSatiri.ends_at && new Date(kodSatiri.ends_at) < simdi
      const baslamadi = kodSatiri.starts_at && new Date(kodSatiri.starts_at) > simdi
      kuponDurumu = baslamadi
        ? { tip: 'baslamadi' }
        : bitti
          ? { tip: 'suresi_dolmus' }
          : { tip: 'kapali' }
    } else if (!kodHatasi) {
      kuponDurumu = { tip: 'bulunamadi' }
    }
  }

  const ozet = sepetHesabi({
    kalemler: dogrulanmis.kalemler,
    kampanyalar: adaylar,
    musteri: params.musteri,
    kargoTutari: params.kargoTutari ?? 0,
  })

  // Kod bir kampanyaya bağlandıysa: kazandı mı, koşula mı takıldı, yoksa
  // daha avantajlı bir kampanya mı öne geçti? (Faz 25)
  if (eslesenKampanya) {
    const kazandi = ozet.uygulananlar.some((u) => u.kampanyaId === eslesenKampanya!.id)
    if (kazandi) {
      kuponDurumu = { tip: 'uygulandi' }
    } else {
      const uygunluk = kampanyaUygunMu(
        dogrulanmis.kalemler as any,
        eslesenKampanya,
        // sepetHesabi ile AYNI varsayılan: müşteri bilgisi verilmediyse
        // "misafir, ilk alışveriş" kabul edilir.
        params.musteri ?? { uyeMi: false, oncekiTeslimatVar: false }
      )
      kuponDurumu = uygunluk.uygun
        ? { tip: 'golgelendi', kazananAd: ozet.uygulananlar[0]?.ad }
        : { tip: 'uygun_degil', sebep: uygunluk.sebep, eksikTutar: uygunluk.eksikTutar }
    }
  }

  // Eski `kodHatasi` alanı korunuyor (ödeme ucu onu okuyor) ama artık metni
  // tek kaynaktan geliyor.
  if (kuponDurumu) kodHatasi = kuponMesaji(kuponDurumu)

  // Kupon gerçekten kazandı mı? (daha yüksek kampanya varsa kupon harcanmaz)
  const kuponUygulandi = Boolean(
    kisiselKuponKampanyaId && ozet.uygulananlar.some((u) => u.kampanyaId === kisiselKuponKampanyaId)
  )

  return {
    ozet,
    kalemler: dogrulanmis.kalemler as any,
    kodHatasi,
    kuponDurumu,
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
    // Faz 27: joker karakterle kupon kodu keşfini engellemek için tam eşleşme.
    .eq('code', kod)
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
  //
  // Faz 27: kontrol AÇIK başarısız oluyordu. Koşul `sahip && veren && ...`
  // biçimindeydi; kuponun `email` alanı boşsa (ya da `user_id` ile
  // tanımlanmışsa) hiçbir kontrol çalışmıyor ve kişiye özel kupon HERKESE
  // açılıyordu. Artık kapalı başarısız: campaign_coupons tablosundaki bir
  // kupon kişiseldir, sahibi doğrulanmadan kullanılamaz.
  const sahip = (data.email ?? '').trim().toLocaleLowerCase('tr-TR')
  const veren = (eposta ?? '').trim().toLocaleLowerCase('tr-TR')
  if (!veren) {
    return { kampanya: null, kuponId: null, hata: 'Kuponu kullanmak için e-posta adresinizi girin' }
  }
  if (!sahip || sahip !== veren) {
    return { kampanya: null, kuponId: null, hata: 'Bu kupon başka bir hesaba tanımlı' }
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
