import { adminOrderRequestEmail, talepTeyidiEmail } from '@/lib/emails/templates'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { sendMail } from '@/lib/emails/send'
import { adimKaydet } from '@/lib/iade/akis'
import { CAYMA_SURESI_GUN, GERI_GONDERME_GUN } from '@/lib/legal/sozlesme'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * İade talebi açmanın TEK YERİ (Faz 33).
 *
 * İki kapı var ve ikisi de aynı işi yapmalı:
 *   · müşteri kendi açar  → /api/kargo-takip/iade (sipariş no + e-posta doğrular)
 *   · mağaza adına açar   → /api/panel/order-requests (telefonla arayan müşteri)
 *
 * Kayıt, bildirim maili, müşteriye teyit maili ve iade defterine düşen adım
 * birebir aynı olmalı; iki kopya kod olsaydı biri düzelirken diğeri geride
 * kalırdı. Kimlik doğrulaması çağıran ucun işidir — buraya YALNIZ doğrulanmış
 * sipariş satırı gelir.
 */

export type SiparisOzeti = {
  id: string
  order_number: string
  status: string
  guest_email: string | null
  total: number | null
  updated_at: string | null
}

export type TalepSonucu =
  | { ok: true; sureDoldu: boolean; gecenGun: number }
  | { ok: false; durum: number; hata: string; kod?: string }

/**
 * Teslim tarihi: gönderi olay defterindeki "teslim edildi" kaydı tek doğru
 * kaynak (orders'ta teslim tarihi sütunu yok). Yoksa siparişin son güncellenme
 * zamanına düşülür — müşteri aleyhine yorum yapılmaz.
 */
export async function teslimTarihiBul(
  service: ReturnType<typeof createServiceClient>,
  orderId: string,
  yedek: string | null
): Promise<Date> {
  const { data: gonderi } = await service
    .from('shipments')
    .select('id')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (gonderi?.id) {
    const { data: olay } = await service
      .from('shipment_events')
      .select('occurred_at')
      .eq('shipment_id', gonderi.id)
      .eq('status', 'teslim_edildi')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (olay?.occurred_at) return new Date(olay.occurred_at)
  }
  return yedek ? new Date(yedek) : new Date()
}

export async function iadeTalebiAc(girdi: {
  siparis: SiparisOzeti
  gerekce: string | null
  /** Kim açtı — iade defterine not olarak düşer. */
  kaynak: 'musteri' | 'panel'
  /**
   * Cayma süresi dolmuşsa engelle mi?
   *
   * Müşterinin kendi açtığı talepte EVET: 14 gün yasal hak, sonrası vaat
   * edilmiş bir şey değil. Panelden açarken HAYIR: süre dolmuş bir iadeyi
   * kabul etmek mağazanın kendi kararıdır, kanun bunu yasaklamaz — sayı yine
   * de döner ki panelde "süre dolmuş" diye görünsün.
   */
  sureyiUygula: boolean
}): Promise<TalepSonucu> {
  const { siparis, gerekce, kaynak, sureyiUygula } = girdi
  const service = createServiceClient()

  if (siparis.status !== 'delivered') {
    return {
      ok: false,
      durum: 400,
      hata: 'İade talebi yalnızca teslim edilmiş siparişler için oluşturulabilir.',
    }
  }

  const teslimTarihi = await teslimTarihiBul(service, siparis.id, siparis.updated_at)
  const gecenGun = Math.floor((Date.now() - teslimTarihi.getTime()) / 86_400_000)
  const sureDoldu = gecenGun > CAYMA_SURESI_GUN
  if (sureDoldu && sureyiUygula) {
    return {
      ok: false,
      durum: 400,
      hata: `Cayma süresi (${CAYMA_SURESI_GUN} gün) doldu. Yine de bize yazın, birlikte bakalım.`,
      kod: 'SURE_DOLDU',
    }
  }

  const { data: acikTalep } = await service
    .from('order_requests')
    .select('id')
    .eq('order_id', siparis.id)
    .in('status', ['pending', 'cargo_pending', 'cargo_sent', 'inspecting'])
    .maybeSingle()
  if (acikTalep) {
    return {
      ok: false,
      durum: 409,
      hata:
        kaynak === 'panel'
          ? 'Bu siparişin zaten açık bir iade talebi var.'
          : 'Bu sipariş için zaten açık bir iade talebiniz var. E-postanızı kontrol edin.',
    }
  }

  const { data: talep, error } = await service
    .from('order_requests')
    .insert({
      order_id: siparis.id,
      user_id: null,
      request_type: 'return',
      status: 'pending',
      reason: gerekce || null,
    })
    .select('id')
    .single()

  if (error || !talep) {
    return { ok: false, durum: 500, hata: 'Talep kaydedilemedi.' }
  }

  const etiketEki = kaynak === 'panel' ? 'panelden' : 'üyeliksiz'

  // Mağazaya bildirim.
  try {
    const alici = await bildirimAdresi()
    const bildirim = adminOrderRequestEmail(
      { order_number: siparis.order_number, total: siparis.total },
      'return',
      gerekce || null
    )
    await sendMail({ to: alici, ...bildirim, label: `Admin return request (${etiketEki})` })
  } catch (e) {
    console.error('[iade-talebi] yönetici bildirimi gönderilemedi:', e)
  }

  const acanNotu =
    kaynak === 'panel' ? 'Mağaza müşteri adına açtı (panel)' : 'Üyeliksiz — kargo takip sayfasından'

  // Müşteriye DERHÂL teyit — MSY m.11/2. Panelden açılsa da müşteri talebin
  // kaydedildiğini yazılı görmeli; telefonda "açtım" demek kanıt değildir.
  //
  // İade defterine düşen adım mail GİTMESE DE yazılır: panelden açılan bir
  // talepte siparişte e-posta olmayabilir, o zaman da talebin ne zaman ve kim
  // tarafından açıldığı kayıtta durmalı — yoksa panelde iz hiç görünmez.
  let mailId: string | null = null
  let mailNotu: string | null = siparis.guest_email ? null : 'Siparişte e-posta yok — teyit gönderilemedi'
  if (siparis.guest_email) {
    try {
      const teyit = talepTeyidiEmail({
        orderNumber: siparis.order_number,
        tip: 'return',
        gonderimGunu: GERI_GONDERME_GUN,
      })
      const gonderim = await musteriMailiGonder({
        eposta: siparis.guest_email,
        orderNumber: siparis.order_number,
        subject: teyit.subject,
        html: teyit.html,
        label: `Return request received (${etiketEki})`,
      })
      mailId = (gonderim as { id?: string } | null)?.id ?? null
      mailNotu = (gonderim as { sebep?: string } | null)?.sebep ?? null
    } catch (e) {
      console.error('[iade-talebi] teyit maili gönderilemedi:', e)
      mailNotu = 'Teyit maili gönderilemedi'
    }
  }
  await adimKaydet(service, siparis.id, 'talep', { mailId, mailNotu, not: acanNotu })

  return { ok: true, sureDoldu, gecenGun }
}
