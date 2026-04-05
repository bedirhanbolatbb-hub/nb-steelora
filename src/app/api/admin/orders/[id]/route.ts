import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { refundFullPayment } from '@/lib/iyzico/client'
import { increaseStock } from '@/lib/trendyol/stockUpdate'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Update order status + optional tracking number (service role — reliable without Supabase session)
  const serviceClient = createServiceClient()

  const { data: existing, error: fetchErr } = await serviceClient
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: fetchErr?.message || 'Sipariş bulunamadı' }, { status: 404 })
  }

  const updateData: any = {
    status: body.status,
    updated_at: new Date().toISOString(),
  }
  if (body.tracking_number) {
    updateData.tracking_number = body.tracking_number
  }

  if (body.status === 'cancelled') {
    if (existing.status === 'cancelled') {
      return NextResponse.json({ success: true })
    }

    if (existing.status === 'paid' && existing.iyzico_payment_id) {
      const refund = await refundFullPayment(String(existing.iyzico_payment_id))
      if (!refund.success) {
        return NextResponse.json(
          { error: refund.error || 'iyzico iade başarısız' },
          { status: 502 }
        )
      }
    }

    if (existing.stock_deducted_at && !existing.stock_restored_at && existing.items) {
      for (const item of existing.items as any[]) {
        if (!item?.productId || item.productId === 'KARGO') continue
        const inc = await increaseStock(item.productId, Number(item.quantity) || 1)
        if (!inc.success) {
          return NextResponse.json(
            { error: inc.error || 'Stok iadesi başarısız' },
            { status: 500 }
          )
        }
      }
      updateData.stock_restored_at = new Date().toISOString()
    }
  }

  const { data: order, error } = await serviceClient
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select('order_number, guest_email')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send shipping notification email
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
      <p style="margin: 0; font-size: 24px; font-weight: 600; color: #FFF8F6; letter-spacing: 0.1em;">${body.tracking_number}</p>
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
