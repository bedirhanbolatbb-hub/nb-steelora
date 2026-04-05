import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateOrderStatusTransition } from '@/lib/orders/statusTransitions'
import { executeAdminOrderCancellation } from '@/lib/admin/executeOrderCancellation'
import { isAdminRequest } from '@/lib/admin/requireAdmin'

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
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const supabase = await createClient()

  if (type === 'product') {
    const { error } = await supabase
      .from('products')
      .update({
        override_title: body.override_title,
        custom_price: body.custom_price ?? null,
        override_description: body.override_description,
        is_featured: body.is_featured,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

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
    .select('order_number, guest_email')
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
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: 'NB Steelora <onboarding@resend.dev>',
        to: order.guest_email,
        subject: `Siparişiniz Kargoya Verildi — ${order.order_number}`,
        html: `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2A1E1E;">
  <div style="text-align: center; padding: 30px 0; border-bottom: 1px solid #E8D8D0;">
    <h1 style="letter-spacing: 0.3em; font-size: 20px; font-weight: 400; margin: 0;">NB STEELORA</h1>
    <p style="font-size: 11px; color: #C89080; letter-spacing: 0.2em; margin: 5px 0 0;">FINE JEWELLERY</p>
  </div>
  <div style="padding: 40px 0;">
    <h2 style="font-size: 24px; font-weight: 300; margin-bottom: 8px;">Siparişiniz Yolda! 🚚</h2>
    <p style="color: #7A5048; margin-bottom: 30px;">Siparişiniz kargoya verildi. Aşağıdaki takip numarasını kullanarak kargonuzu takip edebilirsiniz.</p>
    <div style="background: #FFF8F6; border: 1px solid #E8D8D0; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Sipariş Numarası</p>
      <p style="margin: 0; font-size: 16px; font-weight: 600;">${order.order_number}</p>
    </div>
    <div style="background: #2A1E1E; padding: 20px; margin-bottom: 30px; text-align: center;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Kargo Takip Numarası</p>
      <p style="margin: 0; font-size: 24px; font-weight: 600; color: #FFF8F6; letter-spacing: 0.2em;">${body.tracking_number}</p>
    </div>
    <p style="color: #7A5048; font-size: 14px; line-height: 1.8;">
      Kargo firmasının web sitesine giderek takip numaranızı girin.<br>
      Sorularınız için <a href="mailto:info@nbsteelora.com" style="color: #C89080;">info@nbsteelora.com</a> adresine yazabilirsiniz.
    </p>
  </div>
  <div style="text-align: center; padding: 30px 0; border-top: 1px solid #E8D8D0; color: #A88070; font-size: 12px;">
    <p style="margin: 0 0 8px;"><a href="https://wa.me/905536552020" style="color: #C89080;">WhatsApp ile yazın</a></p>
    <p style="margin: 8px 0 0; font-size: 11px;">© 2026 NB Steelora®</p>
  </div>
</body>
</html>`,
      })
    } catch (emailError) {
      console.error('Shipping notification email error:', emailError)
    }
  }

  return NextResponse.json({ success: true })
}
