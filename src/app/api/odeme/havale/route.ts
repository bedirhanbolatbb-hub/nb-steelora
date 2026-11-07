import { NextResponse, after } from 'next/server'
import { metinAlani } from '@/lib/guvenlik/girdi'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'
import { sozlesmeOnayiDamgasi } from '@/lib/legal/sozlesme'
import { kritikUyari } from '@/lib/izleme/uyari'
import { sepetOzetiHesapla, musteriDurumu } from '@/lib/campaigns/sepetOzeti'
import { sepetiDogrula } from '@/lib/campaigns/sepetDogrula'
import { shippingCostFor } from '@/lib/shipping'
import { havaleAyariOku } from '@/lib/odeme/havaleAyari'
import { havaleHazirMi, havaleIndirimiHesapla, ibanBicimle } from '@/lib/odeme/havale'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { sendMail } from '@/lib/emails/send'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { bildirimDamgala } from '@/lib/emails/bildirimSuprugu'
import { adminHavaleSiparisiEmail, havaleTalimatiEmail } from '@/lib/emails/templates'

export const maxDuration = 30

const kurus = (n: number) => Math.round(n * 100) / 100

/** Ödeme için tanınan süre — müşteri mailinde ve teşekkür sayfasında yazar. */
const ODEME_SURESI_SAAT = 48

/**
 * Havale/EFT ile sipariş oluşturma (7 Kas 2026).
 *
 * Kart ödemesi kapalıyken (bkz. /api/payment/initialize) tek sipariş yolu.
 * Kartlı akışın bütün sunucu kuralları AYNEN uygulanır:
 *  - sepet fiyatı istemciden okunmaz; fiyat DB'den, ayrışmada 409 (Faz 17/22),
 *  - indirim aynı motordan + ek havale indirimi (lib/odeme/havale.ts),
 *  - kimlik oturumdan çözülür (Faz 27), mesafeli satış onayı zorunlu (Faz 19),
 *  - kalıcı hız sınırı.
 * Sipariş 'pending' açılır, metadata.odeme_yontemi='havale'. Stok ve kupon
 * ödeme panelden onaylanınca düşer (odemeSonrasiIsle) — ödenmeyen sipariş
 * stok tutmaz.
 */
export async function POST(request: Request) {
  const _sinir = await hizSiniri(`havale:${istekKimligi(request)}`, 10, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

  try {
    const ayar = await havaleAyariOku()
    if (!havaleHazirMi(ayar)) {
      return NextResponse.json(
        {
          error:
            'Havale/EFT ile ödeme kısa süre içinde açılıyor. Dilerseniz ürünlerimizi Trendyol mağazamızdan (NB STEELORA) da alabilirsiniz.',
          code: 'HAVALE_HAZIR_DEGIL',
        },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => null)
    const items = Array.isArray(body?.items) ? body.items : []
    const { buyer, shippingAddress, discountCode, giftNote, sozlesmeOnay } = body ?? {}

    if (sozlesmeOnay !== true) {
      return NextResponse.json(
        { error: 'Ön bilgilendirme formunu ve mesafeli satış sözleşmesini onaylamanız gerekiyor.' },
        { status: 400 }
      )
    }

    const f = body?.fatura
    const firma = metinAlani(f?.firma, 150)
    const vergiDairesi = metinAlani(f?.vergiDairesi, 80)
    const vergiNo = metinAlani(f?.vergiNo, 11).replace(/\D/g, '')
    const kurumsalFatura = firma && vergiDairesi && vergiNo ? { firma, vergiDairesi, vergiNo } : null

    // Kimlik SUNUCUDAN (Faz 27). Havalede e-posta zorunlu: ödeme bilgileri
    // ve onay ancak oraya gider.
    const { data: oturum } = await (await createServerClient()).auth.getUser()
    const gercekUserId = oturum?.user?.id ?? null
    const gercekEposta = (
      oturum?.user?.email ?? (typeof buyer?.email === 'string' ? buyer.email : '')
    ).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gercekEposta)) {
      return NextResponse.json({ error: 'Geçerli bir e-posta adresi yazın.' }, { status: 400 })
    }

    const adSoyad = metinAlani([buyer?.firstName, buyer?.lastName].filter(Boolean).join(' '), 100)
    const telefon = metinAlani(String(buyer?.phone ?? '').replace(/\s/g, ''), 20)
    const il = metinAlani(shippingAddress?.city, 50)
    const ilce = metinAlani(shippingAddress?.district, 50)
    const adres = metinAlani(shippingAddress?.address, 500)
    if (!adSoyad || !telefon || !il || !ilce || !adres) {
      return NextResponse.json({ error: 'Teslimat bilgilerinde eksik alan var.' }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    const dogrulanmis = await sepetiDogrula(serviceClient, items)
    if (dogrulanmis.kalemler.length === 0) {
      return NextResponse.json({ error: 'Sepetinizdeki ürünler bulunamadı' }, { status: 400 })
    }
    if (dogrulanmis.gecersizler.length > 0) {
      return NextResponse.json(
        { error: 'Sepetinizdeki bazı ürünler artık satışta değil. Sepeti yenileyin.' },
        { status: 400 }
      )
    }
    if (dogrulanmis.fiyatFarklari.length > 0) {
      return NextResponse.json(
        {
          error: 'Sepetinizdeki fiyatlar güncellendi. Lütfen sepeti yenileyip tekrar deneyin.',
          code: 'FIYAT_DEGISTI',
        },
        { status: 409 }
      )
    }

    const subtotal = dogrulanmis.araToplam
    const musteri = await musteriDurumu(serviceClient, { userId: gercekUserId, eposta: gercekEposta })
    const { ozet, kodHatasi, kisiselKuponId } = await sepetOzetiHesapla(serviceClient, {
      items,
      kod: discountCode ? String(discountCode) : null,
      musteriEpostasi: gercekEposta,
      musteri,
    })
    if (discountCode && kodHatasi) {
      return NextResponse.json({ error: `İndirim kodu uygulanamadı: ${kodHatasi}` }, { status: 400 })
    }

    const uygulananKampanyaId = ozet.uygulananlar[0]?.kampanyaId ?? null
    const kampanyaIndirimi = Math.min(ozet.indirimToplami, subtotal)
    const havaleInd = havaleIndirimiHesapla({
      araToplam: subtotal,
      kampanyaIndirimi,
      ayar,
      simdi: new Date(),
    })
    const indirimToplami = kurus(kampanyaIndirimi + havaleInd.tutar)
    const indirimliAraToplam = kurus(subtotal - indirimToplami)
    const shippingCost = shippingCostFor(indirimliAraToplam)
    const total = kurus(indirimliAraToplam + shippingCost)

    // Ekranda gösterilen tutar ile siparişe yazılan tutar ayrışamaz: müşteri
    // sayfayı açıkken indirim dönemi başlamış/bitmiş olabilir.
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

    const orderNumber = `NBS-${Date.now()}`
    const simdi = new Date()
    const { data: siparis, error: insertError } = await serviceClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        status: 'pending',
        user_id: gercekUserId,
        guest_email: gercekEposta,
        shipping_address: {
          full_name: adSoyad,
          phone: telefon,
          city: il,
          district: ilce,
          neighborhood: metinAlani(shippingAddress?.neighborhood, 80),
          address: adres,
          zip_code: metinAlani(shippingAddress?.zipCode, 10),
        },
        items: dogrulanmis.kalemler.map((k) => ({
          productId: k.productId,
          name: k.ad ?? 'Ürün',
          quantity: k.adet,
          price: k.fiyat,
          category: k.kategori ?? null,
        })),
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: indirimToplami,
        applied_campaign_id: uygulananKampanyaId,
        gift_note: metinAlani(giftNote, 300) || null,
        metadata: {
          ...(kisiselKuponId ? { kisisel_kupon_id: kisiselKuponId } : {}),
          sozlesme_onayi: sozlesmeOnayiDamgasi(),
          ...(kurumsalFatura ? { fatura: kurumsalFatura } : {}),
          odeme_yontemi: 'havale',
          havale: {
            banka: ayar.banka,
            alici: ayar.alici,
            iban: ayar.iban,
            iban_bicimli: ibanBicimle(ayar.iban),
            tutar: total,
            kampanya_indirimi: kampanyaIndirimi,
            indirim: havaleInd.tutar > 0 ? { oran: havaleInd.oran, tutar: havaleInd.tutar } : null,
            son_odeme: new Date(simdi.getTime() + ODEME_SURESI_SAAT * 3_600_000).toISOString(),
          },
        },
        total,
        iyzico_payment_id: null,
      })
      .select()
      .single()

    if (insertError || !siparis) {
      throw new Error(`HAVALE ORDER FAILED: ${insertError?.message ?? 'satır yok'}`)
    }

    // Bildirimler yanıtı bekletmez. Yönetici önce: parayı o kontrol edecek.
    after(async () => {
      try {
        const alici = await bildirimAdresi()
        const sonuc = await sendMail({ to: alici, ...adminHavaleSiparisiEmail(siparis), label: 'Admin havale order' })
        if (!sonuc.error) await bildirimDamgala(siparis.id, 'yeni_siparis', sonuc.id)
      } catch (e: any) {
        console.error('[havale] yönetici bildirimi gönderilemedi:', e?.message)
      }
      try {
        const { subject, html } = havaleTalimatiEmail(siparis)
        const gonderim = await musteriMailiGonder({
          eposta: siparis.guest_email,
          orderNumber: siparis.order_number,
          subject,
          html,
          label: 'Havale talimatı',
        })
        if (gonderim.gonderildi) await bildirimDamgala(siparis.id, 'havale_talimati', gonderim.id ?? null)
      } catch (e: any) {
        console.error('[havale] ödeme bilgisi maili gönderilemedi:', e?.message)
      }
    })

    return NextResponse.json({ success: true, orderNumber })
  } catch (error: any) {
    console.error('[havale] sipariş hatası:', error)
    await kritikUyari({
      tip: 'odeme_baslatma',
      baslik: 'Havale siparişi oluşturulamıyor',
      mesaj: error?.message ?? 'bilinmeyen hata',
      detay: { uc: '/api/odeme/havale' },
    })
    return NextResponse.json(
      { error: 'Sipariş oluşturulamadı. Lütfen birkaç dakika sonra tekrar deneyin.' },
      { status: 500 }
    )
  }
}
