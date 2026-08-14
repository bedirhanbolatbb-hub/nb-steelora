import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import SiparislerClient, { type SiparisSatiri, type TalepSatiri } from './SiparislerClient'

export const metadata: Metadata = { title: 'Siparişler' }
export const dynamic = 'force-dynamic'

export default async function PanelSiparislerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = createServiceClient()

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, guest_email, total, status, created_at, tracking_number, shipping_address, iyzico_payment_id'
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (sp.durum) query = query.eq('status', sp.durum)
  const q = (sp.q || '').trim()
  if (q.length >= 2) {
    const like = `%${q.replace(/[%_]/g, '')}%`
    query = query.or(`order_number.ilike.${like},guest_email.ilike.${like}`)
  }

  const { data: orders } = await query

  const satirlar: SiparisSatiri[] = (orders || []).map((o: any) => ({
    id: o.id,
    no: o.order_number ?? '—',
    musteri: (o.shipping_address as any)?.full_name || o.guest_email || '—',
    email: o.guest_email ?? null,
    tutar: Number(o.total || 0),
    durum: o.status ?? 'pending',
    tarih: o.created_at,
    takipVar: Boolean(o.tracking_number),
  }))

  // Müşteri talepleri (iptal/iade) — salt okunur liste.
  const { data: requests } = await supabase
    .from('order_requests')
    .select('id, request_type, status, reason, created_at, order_id, orders(order_number, guest_email, total)')
    .order('created_at', { ascending: false })
    .limit(100)

  const talepler: TalepSatiri[] = (requests || []).map((r: any) => ({
    id: r.id,
    tip: r.request_type,
    durum: r.status,
    sebep: r.reason ?? r.message ?? null,
    tarih: r.created_at,
    siparisNo: r.orders?.order_number ?? '—',
    email: r.orders?.guest_email ?? null,
    tutar: Number(r.orders?.total || 0),
  }))

  // "Yarım kalan ödemeler": 3DS başlatılmış ama tamamlanmamış siparişler
  // (status=pending). order_requests bu değil — keşif notu raporda.
  const yarimKalan = satirlar.filter((s) => s.durum === 'pending')

  return (
    <SiparislerClient
      satirlar={satirlar}
      talepler={talepler}
      yarimKalan={yarimKalan}
      params={{ durum: sp.durum || '', q, tab: sp.tab || 'siparisler' }}
    />
  )
}
