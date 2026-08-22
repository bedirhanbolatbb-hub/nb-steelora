import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateOrderStatusTransition } from '@/lib/orders/statusTransitions'
import { executeAdminOrderCancellation } from '@/lib/admin/executeOrderCancellation'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { reviewInviteEmail, shippingNotificationEmail } from '@/lib/emails/templates'
import { sendMail } from '@/lib/emails/send'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { ikinciSiparisKuponuVer } from '@/lib/kuponlar/ikinciSiparis'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Geçersiz gövde.' }, { status: 400 })
  }
  // type=product dalı eski panelle emekli oldu (Faz 7D) — ürün yazımı artık
  // yalnız beyaz listeli /api/panel/products/[id] üzerinden.
  const serviceClient = createServiceClient()

  const { data: existing, error: fetchErr } = await serviceClient
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json(
      { success: false, error: fetchErr?.message || 'Sipariş bulunamadı' },
      { status: 404 }
    )
  }

  console.log('[admin-order] PATCH start', {
    orderId: id,
    orderNumber: existing.order_number,
    fromStatus: existing.status,
    toStatus: body.status,
    hasTracking: Boolean(body.tracking_number),
  })

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.tracking_number) {
    updateData.tracking_number = body.tracking_number
  }

  if (body.status === 'cancelled') {
    const cancelResult = await executeAdminOrderCancellation(serviceClient, id)
    if (!cancelResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: cancelResult.error,
          ...(cancelResult.code ? { code: cancelResult.code } : {}),
        },
        { status: cancelResult.status }
      )
    }
    return NextResponse.json({ success: true })
  } else {
    const transitionErr = validateOrderStatusTransition(existing.status, body.status)
    if (transitionErr) {
      console.warn('[admin-order] transition rejected', {
        orderId: id,
        reason: transitionErr,
      })
      return NextResponse.json({ success: false, error: transitionErr }, { status: 400 })
    }
    updateData.status = body.status
  }

  const { data: order, error } = await serviceClient
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select('order_number, guest_email, items, review_invite_sent_at, user_id, total')
    .single()

  if (error) {
    console.error(
      '[admin-order] CRITICAL: final order update failed after side-effects (check refund/stock state)',
      { orderId: id, error }
    )
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  console.log('[admin-order] final status update success', {
    orderId: id,
    status: updateData.status,
  })

  if (body.status === 'shipped' && body.tracking_number && order?.guest_email) {
    const { subject, html } = shippingNotificationEmail(order as any, String(body.tracking_number))
    await musteriMailiGonder({
      eposta: order.guest_email,
      orderNumber: order.order_number,
      subject,
      html,
      label: 'Shipping notification',
    })
  }

  // Teslim edildi → değerlendirme daveti. Sipariş başına yalnız bir kez:
  // review_invite_sent_at doluysa tekrar gönderilmez. Mail hatası durum
  // geçişini engellemez (kargo bildirimiyle aynı desen).
  if (body.status === 'delivered' && order?.guest_email && !order.review_invite_sent_at) {
    const items = Array.isArray(order.items) ? (order.items as any[]) : []
    const productIds = items.map((i) => i?.productId).filter(Boolean)

    let productRows: any[] = []
    if (productIds.length > 0) {
      const { data } = await serviceClient
        .from('products_display')
        .select('slug, display_title, display_images')
        .in('id', productIds)
      productRows = data || []
    }

    const { subject, html } = reviewInviteEmail(
      order as any,
      productRows.map((p) => ({
        slug: p.slug,
        display_title: p.display_title,
        image: (p.display_images as string[] | null)?.[0] ?? null,
      }))
    )

    const sent = await musteriMailiGonder({
      eposta: order.guest_email,
      orderNumber: order.order_number,
      subject,
      html,
      label: 'Review invite',
    })

    // Yalnız gerçekten gönderildiyse damgala — hatada tekrar denenebilir kalır.
    if (sent.gonderildi && sent.id) {
      await serviceClient
        .from('orders')
        .update({ review_invite_sent_at: new Date().toISOString() })
        .eq('id', id)
    }

    // İkinci sipariş kuponu: kişiye özel, tek kullanımlık kod ayrı mailde
    // gider (Faz 17). Hata hâlinde teslim akışı etkilenmez.
    try {
      const kupon = await ikinciSiparisKuponuVer(serviceClient, {
        id: String(id),
        order_number: order.order_number,
        guest_email: order.guest_email,
        user_id: order.user_id ?? null,
        total: order.total ?? null,
      })
      console.log('[admin-orders] ikinci sipariş kuponu:', JSON.stringify(kupon))
    } catch (kuponHata: any) {
      console.error('[admin-orders] kupon üretilemedi:', kuponHata?.message)
    }
  }

  return NextResponse.json({ success: true })
}
