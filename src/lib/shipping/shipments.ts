import { createServiceClient } from '@/lib/supabase/service'
import type { KargoDurumu } from './providers'

/**
 * shipments / shipment_events üzerindeki ortak yazma-okuma işleri.
 * Panel API'si, webhook ve müşteri sorgulama ucu buradan geçer; hiçbir yerde
 * tabloya doğrudan yazılmaz ki olay defteri her zaman gönderiyle tutarlı kalsın.
 */

export type ShipmentRow = {
  id: string
  order_id: string
  provider: string
  provider_shipment_id: string
  tracking_code: string | null
  carrier_name: string | null
  carrier_slug: string | null
  status: KargoDurumu
  status_raw: string | null
  price_estimated: number | null
  price_real: number | null
  desi: number | null
  package_count: number
  label_pdf_url: string | null
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export type ShipmentEventRow = {
  id: string
  status: KargoDurumu
  status_raw: string | null
  note: string | null
  occurred_at: string
  source: 'webhook' | 'manual' | 'poll'
}

export async function gonderiGetir(orderId: string): Promise<ShipmentRow | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ShipmentRow) ?? null
}

export async function olaylariGetir(shipmentId: string): Promise<ShipmentEventRow[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('shipment_events')
    .select('id, status, status_raw, note, occurred_at, source')
    .eq('shipment_id', shipmentId)
    .order('occurred_at', { ascending: true })
  return (data as ShipmentEventRow[]) || []
}

/** Yeni gönderi kaydı + ilk olay. */
export async function gonderiKaydet(veri: {
  orderId: string
  provider: string
  providerShipmentId: string
  status: KargoDurumu
  statusRaw: string
  desi: number
  packageCount: number
}): Promise<ShipmentRow> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      order_id: veri.orderId,
      provider: veri.provider,
      provider_shipment_id: veri.providerShipmentId,
      status: veri.status,
      status_raw: veri.statusRaw,
      desi: veri.desi,
      package_count: veri.packageCount,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  await olayEkle({
    shipmentId: data.id,
    status: veri.status,
    statusRaw: veri.statusRaw,
    note: 'Gönderi oluşturuldu',
    source: 'manual',
  })
  return data as ShipmentRow
}

/**
 * Olay defterine satır ekler. idempotency_key doluysa ve daha önce işlendiyse
 * hiçbir şey yazılmaz (sağlayıcı tekrar denemelerinde çift kayıt olmaz).
 * Dönen değer: satır gerçekten yazıldı mı.
 */
export async function olayEkle(veri: {
  shipmentId: string
  status: KargoDurumu
  statusRaw: string | null
  note: string | null
  source: 'webhook' | 'manual' | 'poll'
  occurredAt?: string | null
  idempotencyKey?: string | null
}): Promise<boolean> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('shipment_events').insert({
    shipment_id: veri.shipmentId,
    status: veri.status,
    status_raw: veri.statusRaw,
    note: veri.note,
    source: veri.source,
    occurred_at: veri.occurredAt || new Date().toISOString(),
    idempotency_key: veri.idempotencyKey || null,
  })
  if (error) {
    // 23505 = benzersizlik ihlali → aynı idempotency_key ile ikinci deneme.
    if ((error as any).code === '23505') return false
    throw new Error(error.message)
  }
  return true
}

/** Gönderi alanlarını günceller (olay yazımı ayrı çağrılır). */
export async function gonderiGuncelle(
  shipmentId: string,
  yama: Partial<
    Pick<
      ShipmentRow,
      | 'tracking_code'
      | 'carrier_name'
      | 'carrier_slug'
      | 'status'
      | 'status_raw'
      | 'price_estimated'
      | 'price_real'
      | 'cancelled_at'
    >
  >
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('shipments')
    .update({ ...yama, updated_at: new Date().toISOString() })
    .eq('id', shipmentId)
  if (error) throw new Error(error.message)
}

/**
 * Eski akışın bozulmaması için orders.tracking_number'ı gönderiyle senkron
 * tutar. Sipariş durumu ve mail tetikleri BURADA çalışmaz — onlar mevcut
 * /api/admin/orders/[id] ucunda kalır.
 */
export async function siparisTakipNoSenkronla(orderId: string, takipKodu: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('orders')
    .update({ tracking_number: takipKodu, updated_at: new Date().toISOString() })
    .eq('id', orderId)
}

export async function gonderiSaglayiciIdIleGetir(
  provider: string,
  providerShipmentId: string
): Promise<ShipmentRow | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('shipments')
    .select('*')
    .eq('provider', provider)
    .eq('provider_shipment_id', providerShipmentId)
    .maybeSingle()
  return (data as ShipmentRow) ?? null
}
