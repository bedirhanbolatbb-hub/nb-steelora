import { randomInt } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendMail } from '@/lib/emails/send'
import { secondOrderCouponEmail } from '@/lib/emails/templates'
import { musteriMailiEngeli } from '@/lib/emails/musteriMaili'
import { bildirimAdresi } from '@/lib/emails/bildirim'

/**
 * İkinci sipariş kuponu (Faz 17).
 *
 * Sipariş teslim edildiğinde müşteriye kişiye özel, TEK KULLANIMLIK bir kod
 * üretilir ve AYRI bir mail ile gönderilir.
 *
 * Neden ayrı mail: değerlendirme daveti bir işlem bildirimi; içine indirim
 * kodu konduğunda ileti ticari nitelik kazanır ve abonelikten çıkma bağlantısı
 * gerektirir. İkisini ayırmak hem hukuki ayrımı korur hem de müşteri kuponu
 * kaybetmez (yorum daveti okunmadan silinse bile kupon ayrı satırda durur).
 *
 * Neden teslim anında: Hobby planda dakikalık/gün içi cron yok. Gecikmeli
 * gönderim ayrı bir zamanlayıcı gerektirirdi; teslim anında göndermek hem
 * basit hem de müşterinin ürünü elindeyken temas kurmasını sağlıyor.
 *
 * HOSGELDIN10 ile çakışma: kupon birleşmeye kapalıdır. Sepette daha yüksek bir
 * kampanya varsa o uygulanır ve kupon HARCANMAZ — kullanım damgası yalnız
 * kupon gerçekten uygulandığında atılır.
 */

/** Karışabilecek harfler (I, O, L, U) dışarıda; müşteri elle yazacak. */
const ALFABE = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
const ONEK = 'NBS-TEKRAR-'

export function kuponKoduUret(uzunluk = 6): string {
  let govde = ''
  for (let i = 0; i < uzunluk; i++) govde += ALFABE[randomInt(ALFABE.length)]
  return ONEK + govde
}

/** Şablon kampanya: kuponun kuralını (yüzde, süre, min sepet) taşır. */
async function sablonKampanya(supabase: SupabaseClient): Promise<string | null> {
  const { data: mevcut } = await supabase
    .from('campaigns')
    .select('id')
    .eq('name', 'İkinci Sipariş Kuponu')
    .maybeSingle()
  if (mevcut?.id) return mevcut.id

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name: 'İkinci Sipariş Kuponu',
      description: 'Teslimat sonrası kişiye özel, tek kullanımlık %10 kupon.',
      type: 'discount_code',
      discount_type: 'percent',
      discount_value: 10,
      min_cart_amount: 0,
      is_active: true,
      // Kod kişiye özel üretildiği için kampanyanın kendi kodu yok.
      code: null,
      requires_code: true,
      issues_personal_coupons: true,
      coupon_valid_days: 60,
      combinable: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[ikinci-siparis-kuponu] şablon kampanya oluşturulamadı:', error.message)
    return null
  }
  return data.id
}

export type KuponSonucu =
  | { uretildi: true; kod: string; mailId: string | null }
  | { uretildi: false; sebep: string }

export async function ikinciSiparisKuponuVer(
  supabase: SupabaseClient,
  siparis: {
    id: string
    order_number: string
    guest_email: string | null
    user_id: string | null
    total: number | null
  }
): Promise<KuponSonucu> {
  const eposta = (siparis.guest_email ?? '').trim()
  const yonetici = await bildirimAdresi()
  const engel = musteriMailiEngeli(eposta, siparis.order_number, yonetici)
  if (engel) return { uretildi: false, sebep: engel.sebep }

  const kampanyaId = await sablonKampanya(supabase)
  if (!kampanyaId) return { uretildi: false, sebep: 'sablon-yok' }

  // Aynı siparişten ikinci kupon çıkmaz (UNIQUE(source_order_id) da korur;
  // burada erken dönerek gereksiz kod üretimini engelliyoruz).
  const { data: mevcutKupon, error: okumaHatasi } = await supabase
    .from('campaign_coupons')
    .select('id, code')
    .eq('source_order_id', siparis.id)
    .maybeSingle()

  if (okumaHatasi) {
    // Tablo henüz kurulmadıysa (migration inmediyse) sessizce geç.
    console.warn('[ikinci-siparis-kuponu] kupon tablosu okunamadı:', okumaHatasi.message)
    return { uretildi: false, sebep: 'tablo-yok' }
  }
  if (mevcutKupon) return { uretildi: false, sebep: 'zaten-uretildi' }

  const gecerlilikGun = 60
  const bitis = new Date(Date.now() + gecerlilikGun * 86400000)

  // Kod çakışması olasılığı düşük; yine de üç deneme yapılır.
  let kod = ''
  for (let deneme = 0; deneme < 3; deneme++) {
    kod = kuponKoduUret()
    const { error } = await supabase.from('campaign_coupons').insert({
      campaign_id: kampanyaId,
      code: kod,
      user_id: siparis.user_id,
      email: eposta,
      max_uses: 1,
      expires_at: bitis.toISOString(),
      source: 'second_order',
      source_order_id: siparis.id,
    })
    if (!error) break
    if (deneme === 2) {
      console.error('[ikinci-siparis-kuponu] kupon yazılamadı:', error.message)
      return { uretildi: false, sebep: error.message }
    }
  }

  const mail = secondOrderCouponEmail({
    orderNumber: siparis.order_number,
    kod,
    oran: 10,
    sonKullanim: bitis,
  })
  const gonderim = await sendMail({
    to: eposta,
    subject: mail.subject,
    html: mail.html,
    label: 'Second order coupon',
  })

  return { uretildi: true, kod, mailId: gonderim.id }
}
