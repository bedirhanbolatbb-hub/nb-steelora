import { NextResponse } from 'next/server'
import { initializeThreeDS, generateConversationId } from '@/lib/iyzico/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, buyer, shippingAddress, userId } = body

    const orderNumber = `NBS-${Date.now()}`
    const conversationId = generateConversationId()

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    )
    const shippingCost = subtotal >= 500 ? 0 : 49.9
    const total = subtotal + shippingCost

    const result = await initializeThreeDS({
      locale: 'tr',
      conversationId,
      price: subtotal.toFixed(2),
      paidPrice: total.toFixed(2),
      currency: 'TRY',
      installment: '1',
      basketId: orderNumber,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`,

      buyer: {
        id: buyer.email.replace('@', '_'),
        name: buyer.firstName,
        surname: buyer.lastName,
        gsmNumber: buyer.phone,
        email: buyer.email,
        identityNumber: '74300864791',
        registrationAddress: shippingAddress.address,
        ip: request.headers.get('x-forwarded-for') || '85.34.78.112',
        city: shippingAddress.city,
        country: 'Turkey',
      },

      shippingAddress: {
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        city: shippingAddress.city,
        country: 'Turkey',
        address: shippingAddress.address,
        zipCode: shippingAddress.zipCode || '34000',
      },

      billingAddress: {
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        city: shippingAddress.city,
        country: 'Turkey',
        address: shippingAddress.address,
        zipCode: shippingAddress.zipCode || '34000',
      },

      basketItems: items.map((item: any) => ({
        id: item.productId,
        name: item.name.substring(0, 60),
        category1: item.category || 'Takı',
        itemType: 'PHYSICAL',
        price: (item.price * item.quantity).toFixed(2),
      })),
    })

    if (result.status !== 'success') {
      return NextResponse.json({ error: result.errorMessage }, { status: 400 })
    }

    // Siparişi pending olarak kaydet
    const supabase = await createClient()
    await supabase.from('orders').insert({
      order_number: orderNumber,
      user_id: userId || null,
      guest_email: buyer.email,
      items,
      subtotal,
      shipping_cost: shippingCost,
      total,
      status: 'pending',
      shipping_address: {
        full_name: `${buyer.firstName} ${buyer.lastName}`,
        phone: buyer.phone,
        city: shippingAddress.city,
        district: shippingAddress.district,
        address: shippingAddress.address,
        zip_code: shippingAddress.zipCode,
      },
    })

    return NextResponse.json({
      success: true,
      htmlContent: result.threeDSHtmlContent,
      orderNumber,
      conversationId,
    })
  } catch (error: any) {
    console.error('Payment init error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
