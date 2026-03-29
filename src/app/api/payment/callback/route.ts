import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { completeThreeDS } from '@/lib/iyzico/client'
import { createClient } from '@/lib/supabase/server'
import { decreaseStock } from '@/lib/trendyol/stockUpdate'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  try {
    const formData = await request.formData()
    const paymentId = formData.get('paymentId') as string
    const conversationId = formData.get('conversationData') as string
    const status = formData.get('status') as string

    if (status !== 'success') {
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }

    const result = await completeThreeDS({
      locale: 'tr',
      conversationId,
      paymentId,
    })

    if (result.status !== 'success') {
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }

    // Siparişi güncelle
    const supabase = await createClient()
    const { data: order } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        iyzico_payment_id: result.paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', result.basketId)
      .select()
      .single()

    // Stok düş
    if (order?.items) {
      for (const item of order.items as any[]) {
        await decreaseStock(item.productId, item.quantity)
      }
    }

    // Sipariş onay e-postası gönder
    if (order?.guest_email) {
      try {
        await getResend().emails.send({
          from: 'NB Steelora <onboarding@resend.dev>',
          to: order.guest_email,
          subject: `Siparişiniz Alındı — ${order.order_number}`,
          html: `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2A1E1E;">
  <div style="text-align: center; padding: 30px 0; border-bottom: 1px solid #E8D8D0;">
    <h1 style="letter-spacing: 0.3em; font-size: 20px; font-weight: 400; margin: 0;">NB STEELORA</h1>
    <p style="font-size: 11px; color: #C89080; letter-spacing: 0.2em; margin: 5px 0 0;">FINE JEWELLERY</p>
  </div>
  <div style="padding: 40px 0;">
    <h2 style="font-size: 24px; font-weight: 300; margin-bottom: 8px;">Siparişiniz Alındı 🎁</h2>
    <p style="color: #7A5048; margin-bottom: 30px;">Siparişiniz için teşekkür ederiz. En kısa sürede kargoya vereceğiz.</p>
    <div style="background: #FFF8F6; border: 1px solid #E8D8D0; padding: 20px; margin-bottom: 30px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #C89080; letter-spacing: 0.1em; text-transform: uppercase;">Sipariş Numarası</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600;">${order.order_number}</p>
    </div>
    <h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin-bottom: 16px;">Sipariş Detayları</h3>
    ${(order.items as any[]).map((item: any) => `
      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #F0E8E0;">
        <div>
          <p style="margin: 0; font-size: 14px;">${item.name}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #7A5048;">Adet: ${item.quantity}</p>
        </div>
        <p style="margin: 0; font-size: 14px;">₺${(item.price * item.quantity).toFixed(2)}</p>
      </div>
    `).join('')}
    <div style="padding: 16px 0; border-top: 2px solid #E8D8D0; margin-top: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #7A5048;">Ara Toplam</span>
        <span>₺${order.subtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #7A5048;">Kargo</span>
        <span>${order.shipping_cost === 0 ? 'Ücretsiz' : '₺' + order.shipping_cost.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin-top: 12px;">
        <span>Toplam</span>
        <span>₺${order.total.toFixed(2)}</span>
      </div>
    </div>
    <div style="margin-top: 30px; padding: 20px; background: #FFF8F6; border: 1px solid #E8D8D0;">
      <h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin: 0 0 12px;">Teslimat Adresi</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.8;">
        ${order.shipping_address.full_name}<br>
        ${order.shipping_address.address}<br>
        ${order.shipping_address.district} / ${order.shipping_address.city}
      </p>
    </div>
  </div>
  <div style="text-align: center; padding: 30px 0; border-top: 1px solid #E8D8D0; color: #A88070; font-size: 12px;">
    <p style="margin: 0 0 8px;">Sorularınız için: <a href="mailto:info@nbsteelora.com" style="color: #C89080;">info@nbsteelora.com</a></p>
    <p style="margin: 0;"><a href="https://wa.me/905536552020" style="color: #C89080;">WhatsApp ile yazın</a></p>
    <p style="margin: 16px 0 0; font-size: 11px;">© 2026 NB Steelora®. Tüm hakları saklıdır.</p>
  </div>
</body>
</html>`,
        })
      } catch (emailError) {
        console.error('Order confirmation email error:', emailError)
      }
    }

    return NextResponse.redirect(
      `${siteUrl}/odeme/basarili?order=${result.basketId}`,
      { status: 302 }
    )
  } catch (error: any) {
    console.error('Payment callback error:', error)
    return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
  }
}
