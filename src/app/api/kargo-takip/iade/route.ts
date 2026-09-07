import { NextResponse } from 'next/server'
import { adminOrderRequestEmail, talepTeyidiEmail } from '@/lib/emails/templates'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { sendMail } from '@/lib/emails/send'
import { adimKaydet } from '@/lib/iade/akis'
import { CAYMA_SURESI_GUN, GERI_GONDERME_GUN } from '@/lib/legal/sozlesme'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'
import { ORDER_REQUEST_REASON_MAX_LEN } from '@/lib/account/orderRequestsApi'

export const dynamic = 'force-dynamic'

/**
 * ÜYE OLMAYAN müşterinin iade talebi (Faz 30).
 *
 * GERÇEK OLAY (7 Eyl 2026): ilk gerçek müşteri (üyeliksiz sipariş) tüm
 * ürünleri iade etmek istedi. Ona "Siparişlerim ekranından iade talebi açın"
 * denildi — oysa o ekran YALNIZ üyede var. Üyeliksiz müşterinin sitede iade
 * talebi açmasının hiçbir yolu yoktu; panelde de iade düğmesi müşterinin
 * açtığı talebe bağlı olduğu için mağaza tarafında da açılamıyordu. Yani
 * teslim edilmiş üyeliksiz bir siparişte iade akışı BAŞLATILAMIYORDU.
 *
 * Doğrulama üyelik değil, kargo takip sayfasındaki ile aynı: sipariş numarası
 * + siparişteki e-posta İKİSİ BİRDEN eşleşmeli. Sipariş numarası tek başına
 * yetmez, e-posta tek başına yetmez.
 *
 * Talep kaydı `order_requests`e user_id BOŞ olarak yazılır (sütun zaten
 * nullable — DDL gerekmedi). Panel tarafındaki onay/kod/teslim/para iadesi
 * akışı üyeli taleplerle birebir aynı çalışır.
 */
export async function POST(request: Request) {
  const sinir = await hizSiniri(`iade-talebi:${istekKimligi(request)}`, 5, 3600)
  if (!sinir.gecer) return cokFazlaIstek(sinir.bekleSaniye)

  const body = await request.json().catch(() => null)
  const siparisNo = String(body?.order_number ?? '').trim()
  const eposta = String(body?.email ?? '').trim().toLowerCase()
  const gerekce = String(body?.reason ?? '').trim().slice(0, ORDER_REQUEST_REASON_MAX_LEN)

  if (!siparisNo || !eposta) {
    return NextResponse.json({ error: 'Sipariş numarası ve e-posta gerekli.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: siparis } = await service
    .from('orders')
    .select('id, order_number, status, guest_email, total, updated_at')
    .eq('order_number', siparisNo)
    .maybeSingle()

  // Var/yok ayrımı sızmasın diye tek ve nötr mesaj (kargo takip ucuyla aynı).
  if (!siparis || (siparis.guest_email || '').toLowerCase() !== eposta) {
    return NextResponse.json(
      { error: 'Kayıt bulunamadı. Bilgileri kontrol edip tekrar deneyin.' },
      { status: 404 }
    )
  }

  if (siparis.status !== 'delivered') {
    return NextResponse.json(
      { error: 'İade talebi yalnızca teslim edilmiş siparişler için oluşturulabilir.' },
      { status: 400 }
    )
  }

  // Teslim tarihi: gönderi olay defterindeki "teslim edildi" kaydı tek doğru
  // kaynak (orders'ta teslim tarihi sütunu yok). Yoksa siparişin son
  // güncellenme zamanına düşülür — müşteri aleyhine yorum yapılmaz.
  const teslimTarihi = await teslimTarihiBul(service, siparis.id, siparis.updated_at)
  const gecenGun = Math.floor((Date.now() - teslimTarihi.getTime()) / 86_400_000)
  if (gecenGun > CAYMA_SURESI_GUN) {
    return NextResponse.json(
      {
        error: `Cayma süresi (${CAYMA_SURESI_GUN} gün) doldu. Yine de bize yazın, birlikte bakalım.`,
        code: 'SURE_DOLDU',
      },
      { status: 400 }
    )
  }

  const { data: acikTalep } = await service
    .from('order_requests')
    .select('id, status')
    .eq('order_id', siparis.id)
    .in('status', ['pending', 'cargo_pending', 'cargo_sent', 'inspecting'])
    .maybeSingle()
  if (acikTalep) {
    return NextResponse.json(
      { error: 'Bu sipariş için zaten açık bir iade talebiniz var. E-postanızı kontrol edin.' },
      { status: 409 }
    )
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
    return NextResponse.json({ error: 'Talep kaydedilemedi.' }, { status: 500 })
  }

  // Mağazaya bildirim.
  try {
    const alici = await bildirimAdresi()
    const bildirim = adminOrderRequestEmail(
      { order_number: siparis.order_number, total: siparis.total },
      'return',
      gerekce || null
    )
    await sendMail({ to: alici, ...bildirim, label: 'Admin return request (üyeliksiz)' })
  } catch (e) {
    console.error('[iade-talebi] yönetici bildirimi gönderilemedi:', e)
  }

  // Müşteriye DERHÂL teyit — MSY m.11/2 (üyeli akışla aynı şablon).
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
      label: 'Return request received (üyeliksiz)',
    })
    await adimKaydet(service, siparis.id, 'talep', {
      mailId: (gonderim as any)?.id ?? null,
      mailNotu: (gonderim as any)?.sebep ?? null,
      not: 'Üyeliksiz — kargo takip sayfasından',
    })
  } catch (e) {
    console.error('[iade-talebi] teyit maili gönderilemedi:', e)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

async function teslimTarihiBul(
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
