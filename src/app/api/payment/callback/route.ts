import { NextResponse } from 'next/server'
import { completeThreeDS } from '@/lib/iyzico/client'
import { createServiceClient } from '@/lib/supabase/service'
import { decreaseStock } from '@/lib/trendyol/stockUpdate'
import { orderConfirmationEmail } from '@/lib/emails/templates'
import { sendMail } from '@/lib/emails/send'
import { kullanimArtir } from '@/lib/campaigns/pricing'

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

function lineProductId(item: any): string | null {
  const id = item?.productId ?? item?.product_id ?? item?.itemId ?? item?.item_id
  if (id == null || id === '') return null
  const s = String(id).trim()
  if (!s || s === 'KARGO') return null
  return s
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

    // Faz 11: subtotal ARTIK EZİLMEZ. iyzico'nun `price` alanı indirim öncesi
    // brüt sepet (kargo dahil) olduğu için buraya yazılması ürün ara toplamını
    // bozuyordu; doğru değer pending kaydında zaten var. total ise gerçekten
    // tahsil edilen tutarla (paidPrice) güncellenir.
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

    // Kupon kullanım sayacı — ödeme başarılıysa bir kez (Faz 11).
    // Sayaç hiç artmıyordu, bu yüzden max_uses limiti pratikte işlemiyordu.
    // Tek seferlik olması stok damgasıyla aynı kapıya bağlanır: damga zaten
    // varsa bu blok da atlanır (callback tekrar çağrılırsa çift saymaz).
    if (order.applied_campaign_id) {
      const { data: sayacKapisi } = await serviceClient
        .from('orders')
        .select('stock_deducted_at')
        .eq('id', order.id)
        .single()
      if (!sayacKapisi?.stock_deducted_at) {
        await kullanimArtir(serviceClient, order.applied_campaign_id).catch((e: any) =>
          console.error('[callback] kupon sayacı artırılamadı:', e?.message)
        )
      }
    }

    // Stok düş — sadece ödeme başarılı ve sipariş satırı yüklendikten sonra; stock_deducted_at ile tek sefer
    const { data: stockGate, error: stockGateErr } = await serviceClient
      .from('orders')
      .select('stock_deducted_at')
      .eq('id', order.id)
      .single()

    if (stockGateErr) {
      console.error('[callback] stock gate select error:', stockGateErr.message, stockGateErr)
    }

    const itemsArr = Array.isArray(order.items) ? (order.items as any[]) : []

    const alreadyDeducted = Boolean(stockGate?.stock_deducted_at)
    if (alreadyDeducted) {
      console.log('[callback] stock: skip (stock_deducted_at already set)', order.id)
    } else if (itemsArr.length > 0) {
      let stockDecreaseOk = true
      let linesWithProduct = 0
      for (const item of itemsArr) {
        const productId = lineProductId(item)
        if (!productId) {
          console.log('[callback] stock: skip line (no productId)', JSON.stringify(item))
          continue
        }
        linesWithProduct += 1
        const qty = Math.max(1, Number(item.quantity) || 1)
        console.log('[callback] stock: decreaseStock call', { productId, quantity: qty })
        const dec = await decreaseStock(productId, qty)
        console.log('[callback] stock: decreaseStock result', { productId, quantity: qty, success: dec.success, error: dec.error })
        if (!dec.success) {
          stockDecreaseOk = false
          console.error('[callback] stock: decreaseStock failed', { productId, quantity: qty, error: dec.error })
        }
      }
      if (linesWithProduct === 0) {
        console.error('[callback] stock: no line items with productId; order.items:', JSON.stringify(itemsArr).slice(0, 500))
      }
      if (stockDecreaseOk && linesWithProduct > 0) {
        const { error: stampErr } = await serviceClient
          .from('orders')
          .update({ stock_deducted_at: new Date().toISOString() })
          .eq('id', order.id)
        if (stampErr) {
          console.error('[callback] stock: failed to set stock_deducted_at:', stampErr.message)
        }
      }
    } else {
      console.warn('[callback] stock: order.items missing or empty; cannot decrease stock', order.id)
    }

    // Sipariş onay e-postası gönder (şablon: lib/emails/templates.ts)
    if (order?.guest_email) {
      const { subject, html } = orderConfirmationEmail(order as any)
      await sendMail({ to: order.guest_email, subject, html, label: 'Order confirmation' })
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
