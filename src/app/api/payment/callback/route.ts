import { NextResponse } from 'next/server'
import { completeThreeDS } from '@/lib/iyzico/client'
import { createClient } from '@/lib/supabase/server'
import { decreaseStock } from '@/lib/trendyol/stockUpdate'

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

    return NextResponse.redirect(
      `${siteUrl}/odeme/basarili?order=${result.basketId}`,
      { status: 302 }
    )
  } catch (error: any) {
    console.error('Payment callback error:', error)
    return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
  }
}
