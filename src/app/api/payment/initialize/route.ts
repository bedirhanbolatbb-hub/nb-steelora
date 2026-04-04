import { NextResponse } from 'next/server'
import { initializeThreeDS, generateConversationId } from '@/lib/iyzico/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, buyer, shippingAddress, userId } = body

    const safeName = (buyer?.firstName || buyer?.full_name || '').trim().split(/\s+/)
    const firstName = String(buyer?.firstName || safeName[0] || 'Musteri').substring(0, 30)
    const lastName = String(buyer?.lastName || safeName.slice(1).join(' ') || 'Kullanici').substring(0, 30)
    const phone = (buyer?.phone || '05000000000').replace(/\s/g, '')
    const safeAddress = String(shippingAddress?.address || '-').substring(0, 60)
    const safeCity = String(shippingAddress?.city || 'Istanbul').substring(0, 30)
    const safeZip = shippingAddress?.zipCode || '34000'
    const safeContactName = `${firstName} ${lastName}`.substring(0, 60)

    const orderNumber = `NBS-${Date.now()}`
    const conversationId = generateConversationId()

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    )
    const shippingCost = subtotal >= 500 ? 0 : 49.9
    const total = subtotal + shippingCost

    const productItems = items.map((item: any) => {
      const rawName = item.name || item.title || 'Urun'
      const name = String(rawName).substring(0, 60).padEnd(3, ' ').trim() || 'Urun'
      return {
        id: String(item.productId || 'ITEM').substring(0, 40),
        name,
        category1: item.category || 'Taki',
        itemType: 'PHYSICAL',
        price: (item.price * item.quantity).toFixed(2),
      }
    })

    // Kargo'yu basketItems'a ekle — price = basketItems toplamı = paidPrice
    const basketItems = shippingCost > 0
      ? [...productItems, { id: 'KARGO', name: 'Kargo Ücreti', category1: 'Kargo', itemType: 'PHYSICAL', price: shippingCost.toFixed(2) }]
      : productItems

    const result = await initializeThreeDS({
      locale: 'tr',
      conversationId,
      price: total.toFixed(2),
      paidPrice: total.toFixed(2),
      currency: 'TRY',
      installment: '1',
      basketId: orderNumber,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nbsteelora.com').replace('://nbsteelora.com', '://www.nbsteelora.com')}/api/payment/callback`,

      buyer: {
        id: (buyer?.email || 'guest').replace('@', '_'),
        name: firstName,
        surname: lastName,
        gsmNumber: phone,
        email: buyer?.email || 'musteri@nbsteelora.com',
        identityNumber: '11111111110',
        registrationAddress: safeAddress,
        ip: request.headers.get('x-forwarded-for') || '85.34.78.112',
        city: safeCity,
        country: 'Turkey',
      },

      shippingAddress: {
        contactName: safeContactName,
        city: safeCity,
        country: 'Turkey',
        address: safeAddress,
        zipCode: safeZip,
      },

      billingAddress: {
        contactName: safeContactName,
        city: safeCity,
        country: 'Turkey',
        address: safeAddress,
        zipCode: safeZip,
      },

      basketItems,
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
        full_name: `${firstName} ${lastName}`,
        phone,
        city: safeCity,
        district: shippingAddress?.district || '',
        address: safeAddress,
        zip_code: safeZip,
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
