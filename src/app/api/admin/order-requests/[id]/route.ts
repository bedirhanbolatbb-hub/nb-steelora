import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { executeAdminOrderCancellation } from '@/lib/admin/executeOrderCancellation'
import { executeAdminOrderRefund } from '@/lib/admin/executeOrderRefund'
import {
  orderCancelledEmail,
  iadeTalimatiEmail,
  iadeTamamlandiEmail,
} from '@/lib/emails/templates'
import { adimKaydet, paraIadesineHazirMi, sonGonderimGunu } from '@/lib/iade/akis'
import { GERI_GONDERME_GUN, GERI_ODEME_GUN } from '@/lib/legal/sozlesme'
import { getSiteContent } from '@/lib/supabase/content'
import { kunyeGetir } from '@/lib/legal/veriSorumlusu'
import { kritikUyari } from '@/lib/izleme/uyari'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { isLikelyUuid } from '@/lib/admin/isUuid'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id: requestId } = await params
  if (!isLikelyUuid(requestId)) {
    console.warn('[admin-order-requests] invalid request id param', { requestId })
    return NextResponse.json({ success: false, error: 'Talep bulunamadı.' }, { status: 404 })
  }

  let body: { action?: string; iadeKodu?: string; kargoFirmasi?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Geçersiz gövde.' }, { status: 400 })
  }

  // Faz 20: iade akışı dört adıma bölündü — onay artık para göndermiyor.
  const GECERLI = ['approve', 'reject', 'received', 'refund'] as const
  const action = body.action as (typeof GECERLI)[number] | undefined
  if (!action || !GECERLI.includes(action)) {
    return NextResponse.json({ success: false, error: 'Geçersiz işlem.' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: row, error: fetchErr } = await service
    .from('order_requests')
    .select('id, order_id, user_id, request_type, status, created_at, cargo_company, cargo_tracking_code')
    .eq('id', requestId)
    .maybeSingle()

  if (fetchErr || !row) {
    console.warn('[admin-order-requests] request not found', { requestId, fetchErr })
    return NextResponse.json({ success: false, error: 'Talep bulunamadı.' }, { status: 404 })
  }

  if (!isLikelyUuid(row.order_id)) {
    console.warn('[admin-order-requests] invalid order_id on request row', {
      requestId,
      order_id: row.order_id,
    })
    return NextResponse.json(
      { success: false, error: 'Talep geçersiz sipariş bağlantısı içeriyor.' },
      { status: 400 }
    )
  }

  if ((action === 'approve' || action === 'reject') && row.status !== 'pending') {
    console.warn('[admin-order-requests] invalid state: not pending', {
      requestId,
      status: row.status,
    })
    return NextResponse.json(
      { success: false, error: 'Bu talep zaten işlendi.' },
      { status: 400 }
    )
  }

  // ── ÜRÜN TESLİM ALINDI ─────────────────────────────────────────────────
  // Para iadesinin ön koşulu. Yalnız kod gönderilmiş bir talepte işaretlenir.
  if (action === 'received') {
    if (row.status !== 'cargo_sent') {
      return NextResponse.json(
        { success: false, error: 'Önce talebi onaylayıp iade kodunu göndermelisiniz.' },
        { status: 400 }
      )
    }
    const { data: upd, error: e } = await service
      .from('order_requests')
      .update({ status: 'inspecting', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'cargo_sent')
      .select('id')
    if (e || !upd?.length) {
      return NextResponse.json({ success: false, error: 'Durum güncellenemedi.' }, { status: 500 })
    }
    await adimKaydet(service, row.order_id, 'teslim_alindi')
    return NextResponse.json({ success: true, durum: 'inspecting' })
  }

  // ── PARA İADESİ ────────────────────────────────────────────────────────
  // GÜVENLİK AĞI: ürün teslim alınmadan para gönderilemez. Bu kontrol
  // olmadan panelde yanlış düğmeye basmak, ürün elimize hiç geçmeden
  // parayı göndermek anlamına gelirdi.
  if (action === 'refund') {
    if (!paraIadesineHazirMi(row.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Para iadesi için önce "Ürün teslim alındı" işaretlenmelidir.',
          code: 'TESLIM_ALINMADI',
        },
        { status: 400 }
      )
    }

    const refundResult = await executeAdminOrderRefund(service, row.order_id)
    if (!refundResult.ok) {
      console.error('[admin-order-requests] iyzico iadesi başarısız', {
        requestId,
        orderId: row.order_id,
        error: refundResult.error,
      })
      // Sessiz kalmaz: para müşteriye gitmedi, birinin haberi olmalı.
      await kritikUyari({
        tip: 'odeme_baslatma',
        baslik: 'İyzico iadesi başarısız',
        mesaj: refundResult.error ?? 'bilinmeyen hata',
        detay: { talep_id: requestId, siparis_id: row.order_id },
      })
      return NextResponse.json(
        { success: false, error: refundResult.error, ...(refundResult.code ? { code: refundResult.code } : {}) },
        { status: refundResult.status }
      )
    }

    const { data: upd } = await service
      .from('order_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'inspecting')
      .select('id')

    let mailSonucu: unknown = null
    try {
      const { data: order } = await service
        .from('orders')
        .select('order_number, guest_email, total')
        .eq('id', row.order_id)
        .maybeSingle()
      if (order) {
        const mail = iadeTamamlandiEmail({
          orderNumber: order.order_number,
          tutar: refundResult.tutar ?? order.total ?? null,
          geriOdemeGun: GERI_ODEME_GUN,
        })
        mailSonucu = await musteriMailiGonder({
          eposta: order.guest_email,
          orderNumber: order.order_number,
          subject: mail.subject,
          html: mail.html,
          label: 'Return completed',
        })
      }
    } catch (mailErr) {
      console.error('[admin-order-requests] iade tamamlandı maili gönderilemedi', mailErr)
    }

    await adimKaydet(service, row.order_id, 'iade_edildi', {
      mailId: (mailSonucu as any)?.id ?? null,
      mailNotu: (mailSonucu as any)?.sebep ?? null,
      not: refundResult.iadeEdildi ? 'iyzico iadesi yapıldı' : 'ödeme kaydı yok, yalnız durum güncellendi',
    })

    return NextResponse.json({
      success: true,
      durum: upd?.length ? 'approved' : row.status,
      iade: { iadeEdildi: refundResult.iadeEdildi, tutar: refundResult.tutar },
      mail: mailSonucu,
    })
  }

  if (action === 'reject') {
    const { data: updated, error: upErr } = await service
      .from('order_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')

    if (upErr) {
      console.error('[admin-order-requests] reject update failed', upErr)
      return NextResponse.json(
        { success: false, error: 'Red kaydı yazılamadı.' },
        { status: 500 }
      )
    }
    if (!updated?.length) {
      console.warn('[admin-order-requests] reject: no row updated (race or stale)', { requestId })
      return NextResponse.json(
        { success: false, error: 'Talep güncellenemedi veya zaten işlendi.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: true })
  }

  // approve
  if (row.request_type !== 'cancel' && row.request_type !== 'return') {
    console.warn('[admin-order-requests] unknown request_type', {
      requestId,
      request_type: row.request_type,
    })
    return NextResponse.json({ success: false, error: 'Geçersiz talep türü.' }, { status: 400 })
  }

  if (row.request_type === 'cancel') {
    const cancelResult = await executeAdminOrderCancellation(service, row.order_id)
    if (!cancelResult.ok) {
      console.error('[admin-order-requests] cancel approve: executeAdminOrderCancellation failed', {
        requestId,
        orderId: row.order_id,
        error: cancelResult.error,
        status: cancelResult.status,
      })
      return NextResponse.json(
        {
          success: false,
          error: cancelResult.error,
          ...(cancelResult.code ? { code: cancelResult.code } : {}),
        },
        { status: cancelResult.status }
      )
    }
    // ONLY after successful cancellation: mark request approved (below).
  }

  // ── İADE ONAYI: PARA GÖNDERMEZ (Faz 20) ────────────────────────────────
  // Faz 15'te onay anında iyzico'ya tam iade gidiyordu — ürün hiç geri
  // gelmese bile. Artık onay yalnız iade KODUNU üretip müşteriye talimatı
  // gönderiyor; para "Ürün teslim alındı" işaretlendikten sonra, ayrı bir
  // eylemle iade ediliyor.
  if (row.request_type === 'return') {
    const icerik = await getSiteContent()
    const kargoFirmasi =
      (body.kargoFirmasi ?? '').trim() || (icerik.iade_kargo_firmasi ?? '').trim()
    const iadeKodu = (body.iadeKodu ?? '').trim() || (icerik.iade_kargo_kodu ?? '').trim()

    if (!kargoFirmasi || !iadeKodu) {
      return NextResponse.json(
        {
          success: false,
          error:
            'İade kargo firması ve iade kodu gerekli. Kargonomi panelinden kod üretip buraya girin ' +
            '(varsayılanlar Site Metinleri → "İade ve iletişim" alanlarından gelir).',
          code: 'IADE_KODU_GEREKLI',
        },
        { status: 400 }
      )
    }

    const simdi = new Date()
    const { data: upd, error: upErrKod } = await service
      .from('order_requests')
      .update({
        status: 'cargo_sent',
        cargo_company: kargoFirmasi,
        cargo_tracking_code: iadeKodu,
        cargo_info_sent_at: simdi.toISOString(),
        updated_at: simdi.toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')

    if (upErrKod || !upd?.length) {
      return NextResponse.json(
        { success: false, error: 'Talep güncellenemedi veya zaten işlendi.' },
        { status: 400 }
      )
    }

    let kodMaili: unknown = null
    try {
      const [{ data: order }, kunye] = await Promise.all([
        service
          .from('orders')
          .select('order_number, guest_email')
          .eq('id', row.order_id)
          .maybeSingle(),
        kunyeGetir(),
      ])
      if (order) {
        const mail = iadeTalimatiEmail({
          orderNumber: order.order_number,
          kargoFirmasi,
          iadeKodu,
          // Süre, müşterinin TALEBİ oluşturduğu (cayma bildirimini yönelttiği)
          // tarihten işler — MSY m.13/1.
          sonGun: sonGonderimGunu(row.created_at ?? simdi, GERI_GONDERME_GUN),
          adres: [kunye.unvan, kunye.adres].filter(Boolean),
        })
        kodMaili = await musteriMailiGonder({
          eposta: order.guest_email,
          orderNumber: order.order_number,
          subject: mail.subject,
          html: mail.html,
          label: 'Return instructions',
        })
      }
    } catch (mailErr) {
      console.error('[admin-order-requests] iade talimatı maili gönderilemedi', mailErr)
    }

    await adimKaydet(service, row.order_id, 'kod_gonderildi', {
      mailId: (kodMaili as any)?.id ?? null,
      mailNotu: (kodMaili as any)?.sebep ?? null,
      not: `${kargoFirmasi} · ${iadeKodu}`,
    })

    return NextResponse.json({
      success: true,
      durum: 'cargo_sent',
      kargoFirmasi,
      iadeKodu,
      mail: kodMaili,
    })
  }

  // Buradan aşağısı YALNIZ iptal (cancel) akışıdır: ürün henüz gönderilmemiş
  // olduğu için geri gelmesini beklemeye gerek yok, iade hemen yapılır.

  const { data: approvedRows, error: upErr } = await service
    .from('order_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')

  if (upErr) {
    console.error('[admin-order-requests] approve stamp failed', {
      requestId,
      orderId: row.order_id,
      upErr,
    })
    return NextResponse.json(
      {
        success: false,
        error:
          row.request_type === 'cancel'
            ? 'Sipariş iptal edildi ancak talep durumu güncellenemedi. Talebi manuel kontrol edin.'
            : 'Onay kaydı yazılamadı.',
      },
      { status: 500 }
    )
  }

  if (!approvedRows?.length) {
    console.warn('[admin-order-requests] approve: no row updated (race or stale)', { requestId })
    return NextResponse.json(
      { success: false, error: 'Talep güncellenemedi veya zaten işlendi.' },
      { status: 400 }
    )
  }

  // Müşteriye bilgilendirme: iptal/iade akışında hiç mail gitmiyordu, müşteri
  // parasının iade edildiğini yalnız ekranda görüyordu (Faz 15).
  let mailSonucu: unknown = null
  try {
    const { data: order } = await service
      .from('orders')
      .select('order_number, guest_email, total, payment_refunded_at, iyzico_payment_id')
      .eq('id', row.order_id)
      .maybeSingle()
    if (order) {
      // Para gerçekten iade edildi mi: iptal akışı damgayı siparişe yazıyor.
      const { subject, html } = orderCancelledEmail(order as any, Boolean(order.payment_refunded_at))
      // Alıcı ve sipariş numarası güvenlik ağından geçer: boş alıcı, yönetici
      // adresi ve test siparişleri müşteri maili üretmez.
      mailSonucu = await musteriMailiGonder({
        eposta: order.guest_email,
        orderNumber: order.order_number,
        subject,
        html,
        label: row.request_type === 'return' ? 'Return approved' : 'Cancel approved',
      })
    }
  } catch (mailErr) {
    // Mail gönderilemezse işlem geçerli kalır; yalnız loglanır.
    console.error('[admin-order-requests] bilgilendirme maili gönderilemedi', mailErr)
  }

  // Mail sonucu yanıtta da döner: gönderim gerçekten yapıldı mı, yapılmadıysa
  // hangi kural engelledi — panelden ve testten log okumadan görülebilsin.
  return NextResponse.json({ success: true, durum: 'approved', mail: mailSonucu })
}
