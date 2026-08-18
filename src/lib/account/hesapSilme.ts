import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Hesap silme / anonimleştirme çekirdeği (Faz 14).
 *
 * Hem müşterinin kendi talebi (/api/account/delete) hem panelden gelen elle
 * talepler (/api/panel/kvkk) bu modülü çağırır — iki ayrı anonimleştirme
 * mantığı olmasın diye.
 *
 * TEMEL AYRIM:
 *   - Kişisel veriler SİLİNİR (profil, adres, fatura, favori, oturum kaydı).
 *   - Sipariş satırları SİLİNMEZ, ANONİMLEŞTİRİLİR. Vergi Usul Kanunu m.253
 *     ve TTK m.82 fatura/ticari defter saklama yükümlülüğü sipariş kaydının
 *     10 yıl tutulmasını gerektirir; KVKK m.7/3 de kanunda öngörülen hâllerde
 *     silme yerine anonim hâle getirmeye izin verir. Sipariş no, kalemler,
 *     tutarlar, tarih ve ödeme kimliği korunur; kime ait olduğu bilgisi kopar.
 */

/** Anonimleştirilmiş siparişlerde kişisel alanların yerine yazılan değerler. */
export const SILINMIS_EPOSTA = 'silinmis-kullanici@nbsteelora.local'
export const SILINMIS_AD = 'Silinmiş Kullanıcı'

/** Silme izinin consent_logs'ta taşıdığı işaretler. */
export const SILME_KAYNAK = 'hesap_silme'
export const SILME_SURUM = 'hesap-silme-v1'

/** Silmeyi engelleyen sipariş durumları: teslim edilmemiş, yolda ya da hazırlanıyor. */
const DEVAM_EDEN_DURUMLAR = ['paid', 'preparing', 'shipped']

export type SilmeSonucu = {
  anonimlestirilenSiparis: number
  anonimlestirilenTalep: number
  anonimlestirilenYorum: number
  silinenFavori: number
  anonimlestirilenOlay: number
  kimlikOzeti: string
}

/** Kullanıcı kimliğini iz kaydında saklanabilir hâle getirir (geri döndürülemez). */
export function kimlikOzeti(userId: string) {
  return createHash('sha256').update(`nb-hesap-silme:${userId}`).digest('hex').slice(0, 32)
}

/**
 * Silmeyi engelleyen bir durum var mı? Kargo takibi ve iade hakkı, sipariş
 * kişiyle ilişkili kaldığı sürece kullanılabilir; bu yüzden teslim edilmemiş
 * siparişi veya sonuçlanmamış iade/iptal talebi olan hesap silinmez.
 */
export async function silmeEngeli(userId: string): Promise<string | null> {
  const supabase = createServiceClient()

  const { data: siparisler } = await supabase
    .from('orders')
    .select('order_number, status')
    .eq('user_id', userId)
    .in('status', DEVAM_EDEN_DURUMLAR)
    .limit(5)

  if (siparisler && siparisler.length > 0) {
    const numaralar = siparisler.map((s) => s.order_number).join(', ')
    return `Aktif siparişiniz teslim edildikten sonra silebilirsiniz (${numaralar}).`
  }

  const { data: talepler } = await supabase
    .from('order_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1)

  if (talepler && talepler.length > 0) {
    return 'Sonuçlanmamış bir iade/iptal talebiniz var; talep kapandıktan sonra hesabınızı silebilirsiniz.'
  }

  return null
}

/**
 * Kişisel verileri siler, mali kayıtları anonimleştirir.
 *
 * Sıralama kasıtlıdır: auth kaydı EN SON silinir. Araya bir hata girerse
 * kullanıcı hâlâ giriş yapabilir ve işlemi tekrarlayabilir — "hesap gitti ama
 * verisi kaldı" durumu oluşmaz. Adımların hepsi tekrar çalıştırılabilir
 * (idempotent): ikinci koşuda eşleşen satır kalmaz.
 *
 * `authSil` false verilirse (panelden gelen elle talepler) auth kaydına
 * dokunulmaz; yalnız veriler anonimleştirilir.
 */
export async function hesabiSilVeAnonimlestir(params: {
  userId: string
  eposta?: string | null
  visitorId?: string | null
  authSil?: boolean
  kaynak: 'musteri' | 'panel'
}): Promise<SilmeSonucu> {
  const { userId, eposta, visitorId, authSil = true, kaynak } = params
  const supabase = createServiceClient()
  const ozet = kimlikOzeti(userId)

  // 1) Sipariş satırları: kişisel alanlar maskelenir, mali içerik korunur.
  const { data: siparisler } = await supabase
    .from('orders')
    .select('id, shipping_address')
    .eq('user_id', userId)

  for (const siparis of siparisler ?? []) {
    const adres = (siparis.shipping_address ?? {}) as Record<string, unknown>
    await supabase
      .from('orders')
      .update({
        user_id: null,
        guest_email: SILINMIS_EPOSTA,
        gift_note: null,
        shipping_address: {
          // Şehir kalır: satış hangi ile yapıldı bilgisi mali/istatistiksel
          // olarak anlamlı ve tek başına kişiyi tanımlamaz.
          city: adres.city ?? null,
          fullName: SILINMIS_AD,
          phone: null,
          email: null,
          address: null,
          district: null,
        },
      })
      .eq('id', siparis.id)
  }

  // 2) İade/iptal talepleri: sipariş bağı kalır, kullanıcı bağı kopar.
  const { count: talepSayisi } = await supabase
    .from('order_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  await supabase.from('order_requests').update({ user_id: null }).eq('user_id', userId)

  // 3) Yorumlar: silinmez, yazar bilgisi çıkarılır. Ürün puanı ve "doğrulanmış
  //    alışveriş" bilgisi diğer tüketicilere yönelik olduğu için içerik kalır;
  //    kişiyle bağı kopunca kişisel veri olmaktan çıkar (KVKK m.7/3).
  const { count: yorumSayisi } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  await supabase
    .from('reviews')
    .update({ user_id: null, guest_name: SILINMIS_AD, guest_email: null })
    .eq('user_id', userId)

  // 4) Analitik izler: ziyaretçi kimliği bağı koparılır (satırlar anonim ölçüm
  //    olarak kalır).
  let olaySayisi = 0
  if (visitorId) {
    const { count } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_id', visitorId)
    olaySayisi = count ?? 0
    await supabase.from('analytics_events').update({ visitor_id: null }).eq('visitor_id', visitorId)
    await supabase.from('consent_logs').update({ visitor_id: null }).eq('visitor_id', visitorId)
  }

  // 5) Tamamen silinen kişisel kayıtlar.
  const { count: favoriSayisi } = await supabase
    .from('wishlists')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  await supabase.from('wishlists').delete().eq('user_id', userId)
  await supabase.from('user_addresses').delete().eq('user_id', userId)
  await supabase.from('user_billing').delete().eq('user_id', userId)
  await supabase.from('user_profiles').delete().eq('id', userId)

  // 6) İz kaydı — kişisel veri içermez: kimlik özeti + zaman + kaynak.
  //    Ayrı bir tablo açmak yerine KVKK taleplerinin zaten tutulduğu
  //    consent_logs kullanılır (panelde aynı yerden okunur).
  await supabase.from('consent_logs').insert({
    visitor_id: ozet,
    categories: { zorunlu: true, analitik_gelismis: false, pazarlama: false },
    version: SILME_SURUM,
    source: SILME_KAYNAK,
  })

  // 7) Auth kaydı en sonda: buraya kadar her şey temizlendi.
  if (authSil) {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw new Error(`auth kaydı silinemedi: ${error.message}`)
  }

  console.log(
    `[hesap-silme] ${kaynak} · ozet=${ozet} · siparis=${siparisler?.length ?? 0} · yorum=${yorumSayisi ?? 0}` +
      (eposta ? ' · bildirim gönderilecek' : '')
  )

  return {
    anonimlestirilenSiparis: siparisler?.length ?? 0,
    anonimlestirilenTalep: talepSayisi ?? 0,
    anonimlestirilenYorum: yorumSayisi ?? 0,
    silinenFavori: favoriSayisi ?? 0,
    anonimlestirilenOlay: olaySayisi,
    kimlikOzeti: ozet,
  }
}
