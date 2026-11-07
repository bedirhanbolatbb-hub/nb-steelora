import { NextResponse, after } from 'next/server'
import { completeThreeDS } from '@/lib/iyzico/client'
import { createServiceClient } from '@/lib/supabase/service'
import { odemeBildirimleriniGonder, odemeSonrasiIsle } from '@/lib/odeme/odemeSonrasi'

/**
 * Faz 29: rotada süre sınırı TANIMLI DEĞİLDİ. Zincir uzun (iyzico + stok +
 * kupon + Trendyol + iki mail); varsayılan kısa sınır son adımları kesiyordu.
 */
export const maxDuration = 60

function itemsFromIyzicoTransactions(transactions: unknown) {
  if (!Array.isArray(transactions)) return []
  return transactions
    .filter((t: any) => {
      const id = t?.itemId ?? t?.item_id
      return id && String(id) !== 'KARGO'
    })
    .map((t: any) => ({
      productId: String(t.itemId ?? t.item_id),
      name: String(t.itemName ?? t.item_name ?? 'Ürün'),
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

    // Faz 27: kapı `&&` ile kurulmuştu — yalnız İKİ koşul BİRDEN başarısız
    // olduğunda reddediyordu. status='failure' ama mdStatus='1' gelen bir
    // yanıt (ya da tersi) geçiyordu. Doğrusu: ikisinden BİRİ bile
    // sağlanmıyorsa reddet.
    if (status !== 'success' || mdStatus !== '1') {
      console.error('[callback] 3DS failed. status:', status, 'mdStatus:', mdStatus)
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }

    const result = await completeThreeDS({
      locale: 'tr',
      conversationId,
      paymentId,
    })

    // Faz 27: tam yanıt kart BIN'i, son dört hane ve alıcı bilgisi taşıyor.
    console.log(
      '[callback] completeThreeDS:',
      JSON.stringify({ status: result.status, paymentId: result.paymentId, basketId: result.basketId })
    )

    if (result.status !== 'success') {
      console.error('[callback] completeThreeDS failed:', result.errorMessage)
      return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
    }


    const serviceClient = createServiceClient()
    const paidTotal = parseFloat(String(result.paidPrice ?? '0')) || 0
    const subtotalFromIyzico = parseFloat(String(result.price ?? '0')) || 0

    // Faz 11: subtotal ARTIK EZİLMEZ. iyzico'nun `price` alanı indirim öncesi
    // brüt sepet (kargo dahil) olduğu için buraya yazılması ürün ara toplamını
    // bozuyordu; doğru değer pending kaydında zaten var. total ise gerçekten
    // tahsil edilen tutarla (paidPrice) güncellenir.
    // ── Faz 27 · tekrar oynatma ve tutar koruması ────────────────────────
    // Callback yalnızca conversationId/paymentId taşıyor ve iyzico'nun imzası
    // doğrulanmıyor. Aşağıdaki iki kontrol, sipariş kaydının KENDİ durumuna
    // bakarak kötü geçişleri reddeder; iyi yolu hiç değiştirmez.
    const { data: mevcutSiparis } = await serviceClient
      .from('orders')
      .select('status, total, payment_refunded_at')
      .eq('order_number', result.basketId)
      .maybeSingle()

    if (mevcutSiparis) {
      // (a) İptal/iade edilmiş bir sipariş TEKRAR 'paid' yapılamaz. Eski
      //     callback'in yeniden gönderilmesi para iadesini geri alamamalı.
      const kapali = ['cancelled', 'refunded'].includes(String(mevcutSiparis.status))
      if (kapali || mevcutSiparis.payment_refunded_at) {
        console.error(
          '[callback] KAPALI siparişe ödeme callback\'i geldi, yok sayıldı:',
          result.basketId,
          mevcutSiparis.status
        )
        return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
      }
      // (b) Tahsil edilen tutar beklenen tutardan DÜŞÜKSE üzerine yazma.
      //     Sipariş sunucuda hesaplanmış bir tutarla açılıyor; iyzico'nun
      //     bildirdiği tutar ondan azsa bir şey yanlış demektir.
      const beklenen = Number(mevcutSiparis.total) || 0
      if (beklenen > 0 && paidTotal + 0.01 < beklenen) {
        console.error(
          '[callback] TUTAR UYUŞMUYOR — sipariş açılmadı:',
          result.basketId,
          `beklenen=${beklenen} tahsil=${paidTotal}`
        )
        return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
      }
    }

    const { data: updatedRows, error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'paid',
        iyzico_payment_id: result.paymentId,
        total: paidTotal,
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
          shipping_cost: 0,
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

    // Ödeme sonrası zincir ve bildirimler tek kaynakta (7 Kas 2026):
    // havale onayı da aynı fonksiyonları çağırır — bkz. lib/odeme/odemeSonrasi.ts.
    await odemeSonrasiIsle(serviceClient, order, paidTotal, '[callback]')

    // Faz 29: bildirimler yanıtı (müşterinin "teşekkürler" sayfası) bekletmez.
    const tamamlanan = order
    after(async () => {
      await odemeBildirimleriniGonder(tamamlanan, { yonetici: true })
    })

    return NextResponse.redirect(
      `${siteUrl}/siparis-tamamlandi?siparis=${encodeURIComponent(result.basketId || '')}`,
      { status: 302 }
    )
  } catch (error: any) {
    console.error('Payment callback error:', error)
    return NextResponse.redirect(`${siteUrl}/odeme/basarisiz`, { status: 302 })
  }
}
