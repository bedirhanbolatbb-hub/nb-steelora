import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { completeThreeDS } from '@/lib/iyzico/client'
import { createServiceClient } from '@/lib/supabase/service'
import { decreaseStock } from '@/lib/trendyol/stockUpdate'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function itemsFromIyzicoTransactions(transactions: unknown) {
  if (!Array.isArray(transactions)) return []
  return transactions
    .filter((t: any) => t?.itemId && String(t.itemId) !== 'KARGO')
    .map((t: any) => ({
      productId: String(t.itemId),
      name: String(t.itemName ?? 'Ürün'),
      quantity: 1,
      price: parseFloat(String(t.price ?? 0)) || 0,
    }))
}

const emptyShippingAddress = {
  full_name: '',
  phone: '',
  city: '',
  district: '',
  neighborhood: '',
  address: '',
  zip_code: '',
}

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  try {
    const formData = await request.formData()
    const paymentId = formData.get('paymentId') as string
    const conversationId = formData.get('conversationData') as string
    const status = formData.get('status') as string
    const mdStatus = formData.get('mdStatus') as string

    console.log('[callback] paymentId:', paymentId, 'status:', status, 'mdStatus:', mdStatus)

    if (status !== 'success' && mdStatus !== '1') {
      console.error('[callback] 3DS failed. status:', status, 'mdStatus:', mdStatus)
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }

    const result = await completeThreeDS({
      locale: 'tr',
      conversationId,
      paymentId,
    })

    console.log('[callback] completeThreeDS full result:', JSON.stringify(result))

    if (result.status !== 'success') {
      console.error('[callback] completeThreeDS failed:', result.errorMessage)
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }


    const serviceClient = createServiceClient()
    const paidTotal = parseFloat(String(result.paidPrice ?? '0')) || 0
    const subtotalFromIyzico = parseFloat(String(result.price ?? '0')) || 0

    const { data: updatedRows, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'paid',
        iyzico_payment_id: result.paymentId,
        total: paidTotal,
        subtotal: subtotalFromIyzico,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', result.basketId)
      .select()

    let order = updatedRows?.[0] ?? null

    if (updateError) {
      console.error('[callback] order update error:', updateError)
    }

    if (!order) {
      const fallbackItems = itemsFromIyzicoTransactions(result.itemTransactions)
      const { data: inserted, error: insertError } = await serviceClient
        .from('orders')
        .insert({
          order_number: result.basketId,
          iyzico_payment_id: result.paymentId,
          status: 'paid',
          total: paidTotal,
          subtotal: subtotalFromIyzico,
          shipping: 0,
          items: fallbackItems.length ? fallbackItems : result.itemTransactions ?? [],
          guest_email: null,
          user_id: null,
          shipping_address: emptyShippingAddress,
        })
        .select()
        .single()

      console.log('[callback] fallback INSERT result:', inserted)
      console.log('[callback] fallback INSERT error:', insertError)

      if (insertError) {
        console.error('[callback] Supabase insert error:', insertError)
        // Pending row may already exist (e.g. race); retry paid update instead of failing open
        if (insertError.code === '23505') {
          const { data: retryRows, error: retryErr } = await serviceClient
            .from('orders')
            .update({
              status: 'paid',
              iyzico_payment_id: result.paymentId,
              total: paidTotal,
              subtotal: subtotalFromIyzico,
              updated_at: new Date().toISOString(),
            })
            .eq('order_number', result.basketId)
            .select()
          if (retryErr) console.error('[callback] retry update after duplicate:', retryErr)
          order = retryRows?.[0] ?? null
        }
        if (!order) {
          return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
        }
      } else {
        order = inserted
      }
    }

    if (!order) {
      console.error('[callback] order row missing after persist')
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }

    // Stok düş
    if (order.items) {
      for (const item of order.items as any[]) {
        if (!item?.productId || item.productId === 'KARGO') continue
        await decreaseStock(item.productId, Number(item.quantity) || 1)
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
    ${(order.items as any[]).map((item: any) => {
      const line = (Number(item.price) || 0) * (Number(item.quantity) || 1)
      return `
      <div style="padding: 12px 0; border-bottom: 1px solid #F0E8E0;">
        <p style="margin: 0; font-size: 14px;">${item.name}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #7A5048;">₺${line.toFixed(2)}</p>
      </div>
    `
    }).join('')}
    <div style="padding: 16px 0; border-top: 2px solid #E8D8D0; margin-top: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #7A5048;">Kargo</span>
        <span>${(order.shipping ?? order.shipping_cost) === 0 ? 'Ücretsiz' : '₺' + Number(order.shipping ?? order.shipping_cost ?? 0).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; margin-top: 12px;">
        <span>Toplam</span>
        <span>₺${order.total?.toFixed(2)}</span>
      </div>
    </div>
    <div style="margin-top: 30px; padding: 20px; background: #FFF8F6; border: 1px solid #E8D8D0;">
      <h3 style="font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A5048; margin: 0 0 12px;">Teslimat Adresi</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.8;">
        ${order.shipping_address?.full_name}<br>
        ${order.shipping_address?.address}<br>
        ${order.shipping_address?.city}
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
      `${siteUrl}/siparis-tamamlandi?siparis=${encodeURIComponent(result.basketId || '')}`,
      { status: 302 }
    )
  } catch (error: any) {
    console.error('Payment callback error:', error)
    return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
  }
}
