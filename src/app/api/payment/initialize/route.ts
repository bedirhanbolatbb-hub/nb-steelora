import { NextResponse } from 'next/server'
import { metinAlani } from '@/lib/guvenlik/girdi'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { redirectImzala } from '@/lib/iyzico/redirectImza'
import { initializeThreeDS, generateConversationId } from '@/lib/iyzico/client'
import { createServiceClient } from '@/lib/supabase/service'
import { sozlesmeOnayiDamgasi } from '@/lib/legal/sozlesme'
import { kritikUyari } from '@/lib/izleme/uyari'
import { sepetOzetiHesapla, musteriDurumu } from '@/lib/campaigns/sepetOzeti'
import { sepetiDogrula } from '@/lib/campaigns/sepetDogrula'
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
  // Faz 27: kalıcı hız sınırı (bkz. lib/guvenlik/hizSiniri.ts).
  const _sinir = await hizSiniri(`odeme:${istekKimligi(request)}`, 10, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

  try {
    const body = await request.json()
    const { items, buyer, shippingAddress, paymentCard, userId, discountCode, giftNote, sozlesmeOnay } =
      body

    /**
     * Kurumsal fatura bilgisi (Faz 28) — isteğe bağlı.
     *
     * Üçü birden dolu değilse HİÇ saklanmaz: yarım bir vergi kaydı fatura
     * kesmeye yaramaz, yalnız gereksiz kişisel/ticari veri olur.
     */
    const f = body?.fatura
    const firma = metinAlani(f?.firma, 150)
    const vergiDairesi = metinAlani(f?.vergiDairesi, 80)
    const vergiNo = metinAlani(f?.vergiNo, 11).replace(/\D/g, '')
    const kurumsalFatura =
      firma && vergiDairesi && vergiNo ? { firma, vergiDairesi, vergiNo } : null

    // ── Mesafeli satış onayı ZORUNLU (Faz 19) ─────────────────────────────
    // Mesafeli Sözleşmeler Yönetmeliği m.5/m.6: tüketicinin ön bilgilendirmeyi
    // okuduğunu ve sözleşmeyi kabul ettiğini sipariş ÖNCESİNDE beyan etmesi
    // gerekir; ispat yükü satıcıdadır. İstemcideki onay kutusu tek başına
    // yeterli değil — kutu atlanarak da istek atılabilir, bu yüzden burada da
    // doğrulanıyor ve onay siparişe damgalanıyor.
    if (sozlesmeOnay !== true) {
      return NextResponse.json(
        { error: 'Ön bilgilendirme formunu ve mesafeli satış sözleşmesini onaylamanız gerekiyor.' },
        { status: 400 }
      )
    }

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

    // ── Sepet SUNUCUDA doğrulanır (Faz 17) ────────────────────────────────
    // Ara toplam istemciden gelen fiyatla hesaplanıyordu; istekte fiyatı
    // düşürüp ürünü ucuza almak mümkündü. Artık istemciden yalnız "hangi
    // üründen kaç adet" kabul edilir, fiyat/kategori/koleksiyon DB'den okunur.
    const serviceClient = createServiceClient()
    const dogrulanmis = await sepetiDogrula(serviceClient, items)

    if (dogrulanmis.kalemler.length === 0) {
      return NextResponse.json({ error: 'Sepetinizdeki ürünler bulunamadı' }, { status: 400 })
    }
    if (dogrulanmis.gecersizler.length > 0) {
      console.warn('[initialize] sepette bulunamayan ürün:', dogrulanmis.gecersizler)
      return NextResponse.json(
        { error: 'Sepetinizdeki bazı ürünler artık satışta değil. Sepeti yenileyin.' },
        { status: 400 }
      )
    }
    if (dogrulanmis.fiyatFarklari.length > 0) {
      // Fiyat değişmiş olabilir (senkron) ya da istek kurcalanmış olabilir;
      // iki durumda da müşteriye güncel tutarı göstermeden ödeme başlatmayız.
      console.warn('[initialize] fiyat farkı:', JSON.stringify(dogrulanmis.fiyatFarklari))
      return NextResponse.json(
        {
          error: 'Sepetinizdeki fiyatlar güncellendi. Lütfen sepeti yenileyip tekrar deneyin.',
          code: 'FIYAT_DEGISTI',
        },
        { status: 409 }
      )
    }

    const subtotal = dogrulanmis.araToplam

    // ── İndirim: ödeme anında SUNUCUDA yeniden doğrulanır (Faz 11) ──────────
    // İstemciden yalnız kodun kendisi gelir; tutar burada hesaplanır, böylece
    // ekranda görünen indirim ile karttan çekilen tutar birbirini tutar.
    // ── İndirim: sepet/ödeme ekranıyla AYNI motordan (Faz 17) ─────────────
    // Kampanya seçimi, kapsam, tavan ve toplam tek yerde hesaplanır; ekranda
    // görünen tutar ile karttan çekilen tutar yapısal olarak ayrışamaz.
    // ── Faz 27 · kimlik SUNUCUDAN çözülür ───────────────────────────────
    // `userId` ve `buyer.email` istek gövdesinden geliyordu ve hiç
    // doğrulanmıyordu. İki sonucu vardı: (1) başka bir kullanıcının UUID'sini
    // bilen biri siparişi o hesaba iliştirebilir, sipariş kurbanın "Hesabım"
    // listesinde görünürdü; (2) `musteriDurumu` üyeliği yalnız
    // `Boolean(userId)` ile ölçtüğü için gövdeye rastgele bir kimlik yazan
    // misafir, "yalnız üyelere" ve "ilk alışveriş" kampanyalarını alabiliyordu.
    const { data: oturum } = await (await createServerClient()).auth.getUser()
    const gercekUserId = oturum?.user?.id ?? null
    const gercekEposta = oturum?.user?.email ?? (typeof buyer?.email === 'string' ? buyer.email : null)

    const musteri = await musteriDurumu(serviceClient, {
      userId: gercekUserId,
      eposta: gercekEposta,
    })
    const { ozet, kodHatasi, kisiselKuponId } = await sepetOzetiHesapla(serviceClient, {
      items,
      kod: discountCode ? String(discountCode) : null,
      musteriEpostasi: gercekEposta,
      musteri,
    })
    if (discountCode && kodHatasi) {
      // Kod ödeme anında geçersizleştiyse sessizce indirimsiz sürdürmeyiz.
      return NextResponse.json({ error: `İndirim kodu uygulanamadı: ${kodHatasi}` }, { status: 400 })
    }

    const uygulananKampanyaId = ozet.uygulananlar[0]?.kampanyaId ?? null
    const discountTotal = Math.min(ozet.indirimToplami, subtotal)
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
    // Faz 27: adres alanları SINIRSIZDI — megabaytlık bir "adres" doğrudan
    // siparişe yazılabiliyordu. Sınırlar kargo etiketinin taşıyabileceği
    // uzunluklara göre seçildi.
    const shipping_address = {
      full_name: metinAlani(fullName, 100),
      phone: metinAlani(phone, 20),
      city: metinAlani(shippingAddress?.city, 50),
      district: metinAlani(shippingAddress?.district, 50),
      neighborhood: metinAlani(shippingAddress?.neighborhood, 80),
      address: metinAlani(shippingAddress?.address, 500),
      zip_code: metinAlani(shippingAddress?.zipCode ?? safeZip, 10),
    }
    // Siparişe yazılan fiyatlar da doğrulanmış (DB) fiyatlardır.
    const orderItems = dogrulanmis.kalemler.map((k) => ({
      productId: k.productId,
      name: k.ad ?? 'Ürün',
      quantity: k.adet,
      price: k.fiyat,
      category: k.kategori ?? null,
    }))

    const { error: pendingOrderError } = await serviceClient.from('orders').insert({
      order_number: orderNumber,
      status: 'pending',
      user_id: gercekUserId,
      guest_email: gercekEposta,
      shipping_address,
      items: orderItems,
      subtotal,
      shipping_cost: shippingCost,
      // Faz 11: indirim ve uygulanan kampanya siparişe yazılır (eskiden 0/null
      // kalıyordu); hediye notu da artık kayboluyordu, birlikte kaydedilir.
      discount_amount: discountTotal,
      applied_campaign_id: uygulananKampanyaId,
      // Arayüzde 300 karakter sınırı vardı ama sunucuda yoktu.
      gift_note: metinAlani(giftNote, 300) || null,
      // Kişisel kupon kullanıldıysa hangi kupon olduğu metadata'da taşınır;
      // ödeme onaylanınca callback bunu harcar (kupon yalnız gerçekten
      // uygulandığında tüketilir).
      // metadata KOŞULSUZ yazılır: eskiden yalnız kişisel kupon varken
      // ekleniyordu, o yüzden kuponsuz siparişlerde sözleşme onayı da
      // kaybolurdu.
      metadata: {
        ...(kisiselKuponId ? { kisisel_kupon_id: kisiselKuponId } : {}),
        sozlesme_onayi: sozlesmeOnayiDamgasi(),
        // Faz 28: kurumsal fatura YALNIZ müşteri istediyse saklanır. Yeni
        // sütun açmak yerine metadata: bu veri her siparişte yok ve yalnız
        // fatura düzenlemek için okunuyor.
        ...(kurumsalFatura ? { fatura: kurumsalFatura } : {}),
      },
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
        id: (gercekUserId || gercekEposta || 'user_001').replace(/[@.]/g, '_'),
        name: firstName,
        surname: lastName,
        gsmNumber: phone,
        email: gercekEposta || 'musteri@nbsteelora.com',
        // Faz 28: STANDART DOLGU. Müşterinin gerçek TC kimlik numarası
        // iyzico'ya HİÇBİR ZAMAN gönderilmez ve bizde saklanmaz.
        //
        // Ölçüm (24.08.2026, canlı iyzico API'sine dört varyantla): alan hiç
        // gönderilmediğinde, boş gönderildiğinde, '11111111110' ve
        // '11111111111' ile gönderildiğinde iyzico'nun yanıtı BİREBİR AYNI
        // (errorCode 5152 — kart aşamasına geçilmiş demektir). Yani alan
        // istek doğrulamasında zorunlu tutulmuyor. Yine de akışın ilerleyen
        // adımlarında istenmesi ihtimaline karşı dolgu gönderilmeye devam
        // ediyor; ölçüm ikisinin de eşdeğer olduğunu gösterdiği için
        // mevzuatta standart kabul edilen değer seçildi.
        identityNumber: '11111111111',
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
      // Faz 27: ara sayfa imzasız içerik basmıyor. İmza SUNUCUDA üretilir;
      // istemci onu olduğu gibi geri gönderir.
      imza: redirectImzala(result.threeDSHtmlContent ?? ''),
      orderNumber,
      conversationId,
    })
        
  } catch (error: any) {
    console.error('Payment init error:', error)
    // Ödeme başlatma çökmesi sessiz kalmamalı: müşteri ödeyemiyor demektir.
    await kritikUyari({
      tip: 'odeme_baslatma',
      baslik: 'Ödeme başlatılamıyor',
      mesaj: error?.message ?? 'bilinmeyen hata',
      detay: { uc: '/api/payment/initialize' },
    })
    // Ham hata metni istemciye SIZDIRILMAZ: Postgres mesajları tablo ve sütun
    // adlarını açık ediyordu. Ayrıntı log'a ve uyarı mailine gidiyor.
    return NextResponse.json(
      { error: 'Ödeme başlatılamadı. Lütfen birkaç dakika sonra tekrar deneyin.' },
      { status: 500 }
    )
  }
}
