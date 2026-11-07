import type { SupabaseClient } from '@supabase/supabase-js'
import { bildirimDamgala } from '@/lib/emails/bildirimSuprugu'
import { decreaseStock } from '@/lib/trendyol/stockUpdate'
import { kuyrugaEkle, kuyrugaIsle } from '@/lib/trendyol/stokKuyrugu'
import { orderConfirmationEmail, adminNewOrderEmail } from '@/lib/emails/templates'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { sendMail } from '@/lib/emails/send'
import { kullanimArtir } from '@/lib/campaigns/pricing'
import { olayYaz } from '@/lib/analytics/track'

/**
 * Ödeme ONAYLANDIKTAN sonra yapılan işler — tek kaynak (7 Kas 2026).
 *
 * Önceden yalnız kart callback'inin içindeydi. Havale/EFT'de ödeme panelden
 * onaylanıyor; aynı zincirin (ölçüm, kupon sayacı, stok düşümü, kişisel
 * kupon, Trendyol stok kuyruğu) ikinci bir kopyası yazılmasın diye buraya
 * taşındı. Sıra ve tek-seferlik kapılar (stock_deducted_at) aynen korunur.
 * Yeni ödeme kuruluşu (PayTR/Tosla) geldiğinde onun callback'i de bunu çağırır.
 */

export function lineProductId(item: any): string | null {
  const id = item?.productId ?? item?.product_id ?? item?.itemId ?? item?.item_id
  if (id == null || id === '') return null
  const s = String(id).trim()
  if (!s || s === 'KARGO') return null
  return s
}

export async function odemeSonrasiIsle(
  serviceClient: SupabaseClient,
  order: any,
  tahsilEdilen: number,
  etiket = '[odeme-sonrasi]'
): Promise<void> {
  // Satın alma ölçümü (Faz 12) — order_id üzerinde benzersiz indeks olduğu
  // için tekrar çağrılsa bile ikinci satır yazılmaz (çift sayım yok).
  await olayYaz({
    event: 'purchase',
    sessionId: `order:${order.order_number ?? order.id}`,
    path: '/odeme',
    device: 'desktop',
    value: tahsilEdilen,
    orderId: order.id,
    meta: { kalem: Array.isArray(order.items) ? order.items.length : 0 },
  })

  // Kupon kullanım sayacı — bir kez (Faz 11). Tek seferlik olması stok
  // damgasıyla aynı kapıya bağlıdır: damga varsa bu blok da atlanır.
  if (order.applied_campaign_id) {
    const { data: sayacKapisi } = await serviceClient
      .from('orders')
      .select('stock_deducted_at')
      .eq('id', order.id)
      .single()
    if (!sayacKapisi?.stock_deducted_at) {
      await kullanimArtir(serviceClient, order.applied_campaign_id).catch((e: any) =>
        console.error(`${etiket} kupon sayacı artırılamadı:`, e?.message)
      )
    }
  }

  // Stok düş — stock_deducted_at ile tek sefer.
  const { data: stockGate, error: stockGateErr } = await serviceClient
    .from('orders')
    .select('stock_deducted_at')
    .eq('id', order.id)
    .single()
  if (stockGateErr) console.error(`${etiket} stok kapısı okunamadı:`, stockGateErr.message)

  const itemsArr = Array.isArray(order.items) ? (order.items as any[]) : []
  if (stockGate?.stock_deducted_at) {
    console.log(`${etiket} stok: zaten düşülmüş`, order.id)
  } else if (itemsArr.length > 0) {
    let stockDecreaseOk = true
    let linesWithProduct = 0
    for (const item of itemsArr) {
      const productId = lineProductId(item)
      if (!productId) continue
      linesWithProduct += 1
      const qty = Math.max(1, Number(item.quantity) || 1)
      const dec = await decreaseStock(productId, qty)
      if (!dec.success) {
        stockDecreaseOk = false
        console.error(`${etiket} stok düşülemedi`, { productId, quantity: qty, error: dec.error })
      }
    }
    if (stockDecreaseOk && linesWithProduct > 0) {
      const { error: stampErr } = await serviceClient
        .from('orders')
        .update({ stock_deducted_at: new Date().toISOString() })
        .eq('id', order.id)
      if (stampErr) console.error(`${etiket} stock_deducted_at yazılamadı:`, stampErr.message)
    }
  } else {
    console.warn(`${etiket} sipariş kalemsiz; stok düşülemedi`, order.id)
  }

  // Kişisel kupon: ödeme ONAYLANDI, kupon şimdi harcanır (Faz 17).
  try {
    const kuponId = order?.metadata?.kisisel_kupon_id
    if (kuponId) {
      const { data: kupon } = await serviceClient
        .from('campaign_coupons')
        .select('id, used_count, max_uses')
        .eq('id', kuponId)
        .maybeSingle()
      if (kupon && (kupon.used_count ?? 0) < (kupon.max_uses ?? 1)) {
        await serviceClient
          .from('campaign_coupons')
          .update({
            used_count: (kupon.used_count ?? 0) + 1,
            redeemed_at: new Date().toISOString(),
            redeemed_order_id: order.id,
            is_active: (kupon.used_count ?? 0) + 1 < (kupon.max_uses ?? 1),
          })
          .eq('id', kupon.id)
          .eq('used_count', kupon.used_count ?? 0)
      }
    }
  } catch (kuponHata: any) {
    console.error(`${etiket} kupon harcanamadı:`, kuponHata?.message)
  }

  // Trendyol stok kuyruğu (Faz 16B): her hata yutulur — Trendyol'daki bir
  // gecikme ödemeyi bozmaz.
  try {
    await kuyrugaEkle({
      orderId: order.id,
      items: itemsArr.map((k) => ({
        productId: k?.productId ?? k?.product_id ?? null,
        quantity: Number(k?.quantity) || 1,
      })),
      yon: 'satis',
    })
    const kuyrukSonuc = await kuyrugaIsle()
    console.log(`${etiket} stok kuyruğu:`, JSON.stringify(kuyrukSonuc))
  } catch (kuyrukHata: any) {
    console.error(`${etiket} stok kuyruğu hatası (ödeme etkilenmedi):`, kuyrukHata?.message)
  }
}

/**
 * Yönetici + müşteri bildirimleri (Faz 29 düzeni): yönetici önce, ikisi de
 * damgalanır; damgasız kalanı gecelik süpürge tamamlar. `yonetici: false`
 * havale onayında kullanılır — yönetici, sipariş oluşturulduğunda zaten
 * haberdar edildi.
 */
export async function odemeBildirimleriniGonder(order: any, secenek: { yonetici: boolean }): Promise<void> {
  if (secenek.yonetici) {
    try {
      const alici = await bildirimAdresi()
      const bildirim = adminNewOrderEmail(order)
      const sonuc = await sendMail({ to: alici, ...bildirim, label: 'Admin new order' })
      if (!sonuc.error) await bildirimDamgala(order.id, 'yeni_siparis', sonuc.id)
    } catch (e: any) {
      console.error('[odeme-sonrasi] yönetici bildirimi gönderilemedi:', e?.message)
    }
  }
  try {
    const { subject, html } = orderConfirmationEmail(order)
    const onay = await musteriMailiGonder({
      eposta: order.guest_email,
      orderNumber: order.order_number,
      subject,
      html,
      label: 'Order confirmation',
    })
    if (onay.gonderildi) await bildirimDamgala(order.id, 'onay', onay.id ?? null)
  } catch (e: any) {
    console.error('[odeme-sonrasi] sipariş onayı gönderilemedi:', e?.message)
  }
}
