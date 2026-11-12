import { NextResponse } from 'next/server'
import { metinAlani } from '@/lib/guvenlik/girdi'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { kartOdemesiKimligi, kurusa, odemeOturumuAc, ortakOdemeSayfasi } from '@/lib/tosla/client'
import type { KartIzi } from '@/lib/tosla/kartOdemesi'
import { createServiceClient } from '@/lib/supabase/service'
import { sozlesmeOnayiDamgasi } from '@/lib/legal/sozlesme'
import { kritikUyari } from '@/lib/izleme/uyari'
import { sepetOzetiHesapla, musteriDurumu } from '@/lib/campaigns/sepetOzeti'
import { sepetiDogrula } from '@/lib/campaigns/sepetDogrula'
import { shippingCostFor } from '@/lib/shipping'

/** Tosla'nın dönüşü buraya gelir (bkz. api/payment/tosla-donus). */
function donusAdresi(): string {
  const taban = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nbsteelora.com')
    .replace('://nbsteelora.com', '://www.nbsteelora.com')
    .replace(/\/+$/, '')
  return `${taban}/api/payment/tosla-donus`
}

export async function POST(request: Request) {
  // Faz 27: kalıcı hız sınırı (bkz. lib/guvenlik/hizSiniri.ts).
  const _sinir = await hizSiniri(`odeme:${istekKimligi(request)}`, 10, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

  // 12 Kas 2026 · KART ÖDEMESİ TOSLA İŞİM ÜZERİNDEN. Kimlik (Vercel ortam
  // değişkenleri) tam VE TOSLA_ODEME_ACIK=evet değilse kart kapalıdır;
  // müşteri havale/EFT ile öder. 7 Kas'ta kapatılan iyzico (eski firmanın
  // üye işyeri) bir daha kullanılmaz.
  const kimlik = kartOdemesiKimligi()
  if (!kimlik) {
    return NextResponse.json(
      {
        error: 'Kartla ödeme şu an kapalı. Havale/EFT ile ödeyebilirsiniz.',
        code: 'KART_KAPALI',
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    // Kart bilgisi bu uca HİÇ gelmez: müşteri kartını Tosla'nın sayfasında girer.
    const { items, buyer, shippingAddress, discountCode, giftNote, sozlesmeOnay } = body

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

    const adParcalari = String(buyer?.firstName || buyer?.full_name || '').trim().split(/\s+/)
    const firstName = String(buyer?.firstName || adParcalari[0] || '').trim()
    const lastName = String(buyer?.lastName || adParcalari.slice(1).join(' ') || '').trim()
    const phone = String(buyer?.phone || '').replace(/\s/g, '')

    // NBS-<13 hane> = 17 karakter; Tosla sipariş numarası ≤ 20 (ölçüldü, 12 Kas).
    const orderNumber = `NBS-${Date.now()}`

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
    const gercekEposta = (
      oturum?.user?.email ?? (typeof buyer?.email === 'string' ? buyer.email : '')
    ).trim()
    // Kartta da e-posta zorunlu (havaleyle aynı kural): sipariş onayı ve
    // olası iade bilgisi ancak oraya gider.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gercekEposta)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi yazın.' }, { status: 400 })
    }

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
    const total = Math.round((indirimliAraToplam + shippingCost) * 100) / 100

    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
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
      zip_code: metinAlani(shippingAddress?.zipCode, 10),
    }
    if (
      !shipping_address.full_name ||
      !shipping_address.phone ||
      !shipping_address.city ||
      !shipping_address.district ||
      !shipping_address.address
    ) {
      return NextResponse.json({ error: 'Teslimat bilgilerinde eksik alan var.' }, { status: 400 })
    }

    // Ekranda gösterilen tutar ile karttan çekilecek tutar ayrışamaz (havale
    // akışıyla aynı kural): sayfa açıkken kampanya başlamış/bitmiş olabilir.
    const beklenen = Number(body?.beklenenToplam)
    if (Number.isFinite(beklenen) && Math.abs(beklenen - total) > 0.009) {
      return NextResponse.json(
        {
          error: `Sepet tutarı güncellendi (${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL). Lütfen kontrol edip tekrar onaylayın.`,
          code: 'TUTAR_DEGISTI',
          toplam: total,
        },
        { status: 409 }
      )
    }

    // Siparişe yazılan fiyatlar da doğrulanmış (DB) fiyatlardır.
    const orderItems = dogrulanmis.kalemler.map((k) => ({
      productId: k.productId,
      name: k.ad ?? 'Ürün',
      quantity: k.adet,
      price: k.fiyat,
      category: k.kategori ?? null,
    }))

    const kartIzi: KartIzi = {
      saglayici: 'tosla',
      ortam: kimlik.ortam,
      durum: 'bekliyor',
      oturum_at: new Date().toISOString(),
    }
    const siparisMetadata = {
      ...(kisiselKuponId ? { kisisel_kupon_id: kisiselKuponId } : {}),
      sozlesme_onayi: sozlesmeOnayiDamgasi(),
      // Faz 28: kurumsal fatura YALNIZ müşteri istediyse saklanır. Yeni
      // sütun açmak yerine metadata: bu veri her siparişte yok ve yalnız
      // fatura düzenlemek için okunuyor.
      ...(kurumsalFatura ? { fatura: kurumsalFatura } : {}),
      odeme_yontemi: 'kart' as const,
      kart: kartIzi,
    }

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
      metadata: siparisMetadata,
      total,
      iyzico_payment_id: null,
    })

    if (pendingOrderError) {
      console.error('PENDING ORDER FAILED', pendingOrderError)
      throw new Error(`PENDING ORDER FAILED: ${pendingOrderError.message}`)
    }
    console.log('PENDING ORDER CREATED')

    // ── Tosla ödeme oturumu ────────────────────────────────────────────
    // Tutar SUNUCUDA hesaplanan `total`; kuruşa çevrilip gider. Tosla
    // sonucu müşterinin tarayıcısıyla dönüş ucuna yollar, karar orada
    // Tosla'ya yeniden sorularak verilir (lib/tosla/kartOdemesi).
    let odemeOturumu: { oturumId: string; islemNo: string | null }
    try {
      odemeOturumu = await odemeOturumuAc(kimlik, {
        siparisNo: orderNumber,
        tutarKurus: kurusa(total),
        aciklama: `NB Steelora siparişi ${orderNumber}`,
        donusAdresi: donusAdresi(),
      })
    } catch (e: any) {
      // Oturum açılamadı: sipariş "yarım kalan" olarak işaretlenir, hata
      // aşağıda BB'ye uyarı olarak gider. Müşteriden para alınmadı.
      const kartBasarisiz: KartIzi = {
        ...kartIzi,
        durum: 'basarisiz',
        neden: `oturum açılamadı: ${String(e?.message ?? e).slice(0, 200)}`,
        sonuc_at: new Date().toISOString(),
      }
      await serviceClient
        .from('orders')
        .update({ metadata: { ...siparisMetadata, kart: kartBasarisiz } })
        .eq('order_number', orderNumber)
        .eq('status', 'pending')
      throw e
    }

    // Oturumun işlem numarası destek için saklanır (Tosla sorgusu ödenmiş
    // işlemde bunu 0 döndürüyor — ölçüldü). Yazılamazsa ödeme etkilenmez.
    if (odemeOturumu.islemNo) {
      await serviceClient
        .from('orders')
        .update({ metadata: { ...siparisMetadata, kart: { ...kartIzi, islem_no: odemeOturumu.islemNo } } })
        .eq('order_number', orderNumber)
        .eq('status', 'pending')
        .eq('metadata->kart->>durum', 'bekliyor')
    }

    return NextResponse.json({
      success: true,
      // Müşteri bu adrese gider; kartı Tosla'nın sayfasında girer.
      yonlendir: ortakOdemeSayfasi(kimlik, odemeOturumu.oturumId),
      orderNumber,
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
