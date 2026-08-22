import { NextResponse } from 'next/server'
import { initializeThreeDS, generateConversationId } from '@/lib/iyzico/client'
import { createServiceClient } from '@/lib/supabase/service'
import { kuponDogrula, otomatikKampanyalar, enIyiIndirim } from '@/lib/campaigns/pricing'
import { shippingCostFor } from '@/lib/shipping'

function toAscii(str: string): string {
  return str
    .replace(/[ğĞ]/g, (c) => c === 'ğ' ? 'g' : 'G')
    .replace(/[üÜ]/g, (c) => c === 'ü' ? 'u' : 'U')
    .replace(/[şŞ]/g, (c) => c === 'ş' ? 's' : 'S')
    .replace(/[ıİ]/g, (c) => c === 'ı' ? 'i' : 'I')
    .replace(/[öÖ]/g, (c) => c === 'ö' ? 'o' : 'O')
    .replace(/[çÇ]/g, (c) => c === 'ç' ? 'c' : 'C')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, buyer, shippingAddress, paymentCard, userId, discountCode, giftNote } = body

    const safeName = (buyer?.firstName || buyer?.full_name || '').trim().split(/\s+/)
    const firstName = toAscii(String(buyer?.firstName || safeName[0] || 'Musteri')).substring(0, 30)
    const lastName = toAscii(String(buyer?.lastName || safeName.slice(1).join(' ') || 'Kullanici')).substring(0, 30)
    const phone = (buyer?.phone || '05000000000').replace(/\s/g, '')
    const safeAddress = toAscii(String(shippingAddress?.address || '-')).substring(0, 60)
    const safeCity = toAscii(String(shippingAddress?.city || 'Istanbul')).substring(0, 30)
    const safeZip = shippingAddress?.zipCode || '00000'
    const safeContactName = `${firstName} ${lastName}`.substring(0, 60)

    const orderNumber = `NBS-${Date.now()}`
    const conversationId = generateConversationId()

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    )

    // ── İndirim: ödeme anında SUNUCUDA yeniden doğrulanır (Faz 11) ──────────
    // İstemciden yalnız kodun kendisi gelir; tutar burada hesaplanır, böylece
    // ekranda görünen indirim ile karttan çekilen tutar birbirini tutar.
    const serviceClient = createServiceClient()
    const urunFiyatlari: number[] = items.flatMap((i: any) =>
      Array.from({ length: Number(i.quantity) || 1 }, () => Number(i.price) || 0)
    )
    const urunAdedi = items.reduce((t: number, i: any) => t + (Number(i.quantity) || 0), 0)

    const otomatik = await otomatikKampanyalar(
      serviceClient,
      subtotal,
      urunAdedi,
      urunFiyatlari
    )

    let kodAdayi: { id: string; name: string; amount: number } | null = null
    if (discountCode) {
      const sonuc = await kuponDogrula(serviceClient, String(discountCode), subtotal)
      if (sonuc.gecerli) {
        kodAdayi = { id: sonuc.kampanya.id, name: sonuc.kampanya.name, amount: sonuc.indirim }
      } else {
        // Kod ödeme anında geçersizleştiyse (süre doldu, limit doldu) ödemeyi
        // sessizce indirimsiz sürdürmek yerine müşteriye söyleriz.
        return NextResponse.json({ error: `İndirim kodu uygulanamadı: ${sonuc.hata}` }, { status: 400 })
      }
    }

    // TEK KAMPANYA: otomatik ve kupon toplanmaz, müşteri lehine olan uygulanır.
    const secilen = enIyiIndirim(otomatik.indirimler, kodAdayi)
    const uygulananKampanyaId = secilen.kampanyaId
    const discountTotal = Math.min(Math.round(secilen.tutar * 100) / 100, subtotal)
    const indirimliAraToplam = Math.round((subtotal - discountTotal) * 100) / 100
    // Kargo koşulsuz ücretsiz (lib/shipping tek kaynağı) — kampanya bayrağı da
    // aynı sonucu verir, hesap tek yerden okunur.
    const shippingCost = shippingCostFor(indirimliAraToplam)
    // iyzico'da price = sepet kalemlerinin toplamı, paidPrice = tahsil edilen.
    const grossTotal = Math.round((subtotal + shippingCost) * 100) / 100
    const total = Math.round((indirimliAraToplam + shippingCost) * 100) / 100

    const productItems = items.map((item: any) => {
      const rawName = item.trendyol_title || item.name || item.title || 'Celik Taki'
      const name = toAscii(String(rawName))
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .substring(0, 60)
        .padEnd(3, ' ')
      return {
        id: String(item.productId || 'ITEM').substring(0, 40),
        name,
        category1: toAscii(item.category || 'Diger').substring(0, 50),
        itemType: 'PHYSICAL',
        price: (item.price * item.quantity).toFixed(2),
      }
    })

    // Kargo'yu basketItems'a ekle — price = basketItems toplamı = paidPrice
    const basketItems = shippingCost > 0
      ? [...productItems, { id: 'KARGO', name: 'Kargo Ucreti', category1: 'Kargo', itemType: 'PHYSICAL', price: shippingCost.toFixed(2) }]
      : productItems

    const fullName = [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ').trim() || safeContactName
    const shipping_address = {
      full_name: fullName,
      phone,
      city: String(shippingAddress?.city ?? ''),
      district: String(shippingAddress?.district ?? ''),
      neighborhood: String(shippingAddress?.neighborhood ?? ''),
      address: String(shippingAddress?.address ?? ''),
      zip_code: String(shippingAddress?.zipCode ?? safeZip),
    }
    const orderItems = items.map((item: any) => ({
      productId: String(item.productId ?? ''),
      name: String(item.name ?? item.title ?? item.trendyol_title ?? 'Ürün'),
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
    }))

    const { error: pendingOrderError } = await serviceClient.from('orders').insert({
      order_number: orderNumber,
      status: 'pending',
      user_id: userId || null,
      guest_email: buyer?.email || null,
      shipping_address,
      items: orderItems,
      subtotal,
      shipping_cost: shippingCost,
      // Faz 11: indirim ve uygulanan kampanya siparişe yazılır (eskiden 0/null
      // kalıyordu); hediye notu da artık kayboluyordu, birlikte kaydedilir.
      discount_amount: discountTotal,
      applied_campaign_id: uygulananKampanyaId,
      gift_note: giftNote || null,
      total,
      iyzico_payment_id: null,
    })

    if (pendingOrderError) {
      console.error('PENDING ORDER FAILED', pendingOrderError)
      throw new Error(`PENDING ORDER FAILED: ${pendingOrderError.message}`)
    }
    console.log('PENDING ORDER CREATED')

    const result = await initializeThreeDS({
      paymentCard: {
        cardHolderName: String(paymentCard?.cardHolderName || '').substring(0, 60),
        cardNumber: String(paymentCard?.cardNumber || '').replace(/\s/g, ''),
        expireMonth: String(paymentCard?.expireMonth || '').padStart(2, '0'),
        expireYear: String(paymentCard?.expireYear || ''),
        cvc: String(paymentCard?.cvc || ''),
        registerCard: '0',
      },
      locale: 'tr',
      conversationId,
      // price = basketItems toplamı (brüt), paidPrice = indirim sonrası tahsil.
      price: grossTotal.toFixed(2),
      paidPrice: total.toFixed(2),
      currency: 'TRY',
      installment: '1',
      basketId: orderNumber,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nbsteelora.com').replace('://nbsteelora.com', '://www.nbsteelora.com')}/api/payment/callback`,

      buyer: {
        id: (userId || buyer?.email || 'user_001').replace(/[@.]/g, '_'),
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
      console.error('[iyzico] full error:', JSON.stringify(result))
      return NextResponse.json(
        { error: result.errorMessage, errorCode: result.errorCode, errorGroup: result.errorGroup },
        { status: 400 }
      )
    }
    
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
