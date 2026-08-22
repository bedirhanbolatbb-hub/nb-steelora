import type { SupabaseClient } from '@supabase/supabase-js'
import { refundFullPayment } from '@/lib/iyzico/client'
import { increaseStock } from '@/lib/trendyol/stockUpdate'
import { kuyrugaEkle, kuyrugaIsle } from '@/lib/trendyol/stokKuyrugu'

function lineProductId(item: any): string | null {
  const id = item?.productId ?? item?.product_id
  if (id == null || id === '') return null
  const s = String(id).trim()
  if (!s || s === 'KARGO') return null
  return s
}

export type AdminOrderRefundResult =
  | { ok: true; iadeEdildi: boolean; tutar: number }
  | { ok: false; status: number; error: string; code?: string }

/**
 * İADE onayı (Faz 15).
 *
 * Bulunan kusur: iade talebi onaylandığında yalnız `order_requests` satırı
 * "approved" işaretleniyordu — iyzico'ya iade isteği HİÇ gitmiyor, stok geri
 * eklenmiyordu. Yani müşteri panelde "iadeniz onaylandı" görüyor ama parası
 * dönmüyordu. (İPTAL yolu doğru çalışıyordu; iki yol ayrı yazılmıştı.)
 *
 * İptalden farkı: teslim edilmiş sipariş `cancelled` durumuna geçemez
 * (statusTransitions: delivered → cancelled yasak). Bu yüzden durum
 * değiştirilmez; para iadesi `payment_refunded_at` damgasıyla, stok iadesi
 * `stock_restored_at` ile kaydedilir. Panel bu damgalara bakıp "iade edildi"
 * gösterir.
 *
 * Sıra kasıtlı: önce para, sonra stok, en sonda damgalar. Her adım
 * idempotent — ikinci çağrı çift iade yapmaz.
 */
export async function executeAdminOrderRefund(
  serviceClient: SupabaseClient,
  orderId: string
): Promise<AdminOrderRefundResult> {
  const { data: order, error: fetchErr } = await serviceClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchErr || !order) {
    return { ok: false, status: 404, error: fetchErr?.message || 'Sipariş bulunamadı' }
  }

  const tutar = Number(order.total) || 0

  // Çift iade koruması.
  if (order.payment_refunded_at) {
    console.log('[admin-order-refund] idempotent — already refunded', { orderId })
    return { ok: true, iadeEdildi: true, tutar }
  }

  let iadeEdildi = false
  if (order.iyzico_payment_id) {
    console.log('[admin-order-refund] refund start', {
      orderId,
      paymentId: order.iyzico_payment_id,
    })
    const refund = await refundFullPayment(String(order.iyzico_payment_id))
    console.log('[admin-order-refund] refund result', {
      orderId,
      success: refund.success,
      error: refund.error,
    })
    if (!refund.success) {
      return { ok: false, status: 502, error: refund.error || 'iyzico iade başarısız', code: 'REFUND_FAILED' }
    }
    iadeEdildi = true

    const { error: stampErr } = await serviceClient
      .from('orders')
      .update({ payment_refunded_at: new Date().toISOString() })
      .eq('id', orderId)
    if (stampErr) {
      console.error(
        '[admin-order-refund] CRITICAL: iyzico iadesi geçti ama payment_refunded_at yazılamadı',
        { orderId, stampErr }
      )
      return { ok: false, status: 500, error: 'İade kaydı veritabanına yazılamadı', code: 'STAMP_FAILED' }
    }
  } else {
    console.log('[admin-order-refund] tahsilat kaydı yok, iade gerekmiyor', { orderId })
  }

  // İade edilen ürünler rafa döner.
  if (order.stock_deducted_at && !order.stock_restored_at) {
    const items = Array.isArray(order.items) ? (order.items as any[]) : []
    for (const item of items) {
      const pid = lineProductId(item)
      if (!pid) continue
      const qty = Math.max(1, Number(item.quantity) || 1)
      const inc = await increaseStock(pid, qty)
      if (!inc.success) {
        console.error('[admin-order-refund] CRITICAL: iade geçti ama stok geri eklenemedi', {
          orderId,
          productId: pid,
          error: inc.error,
        })
        return {
          ok: false,
          status: 500,
          error: inc.error || 'Stok iadesi başarısız',
          code: 'STOCK_RESTORE_FAILED',
        }
      }
    }
    await serviceClient
      .from('orders')
      .update({ stock_restored_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', orderId)

    // Trendyol'a ters kayıt: aynı kuyruktan, delta pozitif (Faz 16B).
    try {
      await kuyrugaEkle({
        orderId,
        items: items.map((k) => ({
          productId: lineProductId(k),
          quantity: Math.max(1, Number(k?.quantity) || 1),
        })),
        yon: 'iade',
      })
      await kuyrugaIsle()
    } catch (kuyrukHata: any) {
      console.error('[admin-order-refund] stok kuyruğu hatası (iade etkilenmedi):', kuyrukHata?.message)
    }
  }

  console.log('[admin-order-refund] success', { orderId, iadeEdildi })
  return { ok: true, iadeEdildi, tutar }
}
