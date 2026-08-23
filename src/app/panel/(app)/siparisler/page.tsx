import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { getSiteContent } from '@/lib/supabase/content'
import { iziOku } from '@/lib/iade/akis'
import { firmaBul, KARGO_FIRMALARI } from '@/lib/shipping/firmalar'
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
      'id, order_number, guest_email, total, status, created_at, tracking_number, shipping_address, iyzico_payment_id, gift_note'
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
    notVar: Boolean((o.gift_note ?? '').trim()),
  }))

  // Müşteri talepleri (iptal/iade) — salt okunur liste.
  const { data: requests } = await supabase
    .from('order_requests')
    .select(
      'id, request_type, status, reason, message, created_at, updated_at, order_id, ' +
        'cargo_company, cargo_tracking_code, cargo_info_sent_at, ' +
        'orders(order_number, guest_email, total, metadata, payment_refunded_at)'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  // Gidiş gönderisinde hangi firma kullanıldı? İade kodu diyaloğu bunu
  // önceden seçili getirir — BB tek firmayla çalışmıyor.
  const talepSiparisIds = [...new Set((requests || []).map((r: any) => r.order_id).filter(Boolean))]
  const gidisFirmalari = new Map<string, string>()
  if (talepSiparisIds.length > 0) {
    const { data: gonderiler } = await supabase
      .from('shipments')
      .select('order_id, carrier_name, carrier_slug, created_at')
      .in('order_id', talepSiparisIds)
      .order('created_at', { ascending: false })
    for (const g of gonderiler ?? []) {
      if (gidisFirmalari.has(g.order_id)) continue // en yenisi kazanır
      const firma = firmaBul(g.carrier_slug ?? g.carrier_name)
      if (firma) gidisFirmalari.set(g.order_id, firma.ad)
    }
  }

  const talepler: TalepSatiri[] = (requests || []).map((r: any) => ({
    id: r.id,
    tip: r.request_type,
    durum: r.status,
    sebep: r.reason ?? r.message ?? null,
    tarih: r.created_at,
    guncelleme: r.updated_at ?? null,
    siparisNo: r.orders?.order_number ?? '—',
    email: r.orders?.guest_email ?? null,
    tutar: Number(r.orders?.total || 0),
    kargoFirmasi: r.cargo_company ?? null,
    gidisFirmasi: gidisFirmalari.get(r.order_id) ?? null,
    iadeKodu: r.cargo_tracking_code ?? null,
    kodGonderimi: r.cargo_info_sent_at ?? null,
    // Adım adım iz: zaman damgaları ve müşteriye giden mail kimlikleri
    // siparişin metadata'sında tutuluyor (Faz 20).
    iz: iziOku(r.orders?.metadata),
    paraIadeEdildi: Boolean(r.orders?.payment_refunded_at),
  }))

  // İade kodu diyaloğunda hazır gelsin diye panelden girilen varsayılanlar.
  const icerik = await getSiteContent()

  // "Yarım kalan ödemeler": 3DS başlatılmış ama tamamlanmamış siparişler
  // (status=pending). order_requests bu değil — keşif notu raporda.
  const yarimKalan = satirlar.filter((s) => s.durum === 'pending')

  return (
    <SiparislerClient
      satirlar={satirlar}
      talepler={talepler}
      yarimKalan={yarimKalan}
      params={{ durum: sp.durum || '', q, tab: sp.tab || 'siparisler' }}
      iadeVarsayilanlari={{
        firma: (icerik.iade_kargo_firmasi ?? '').trim(),
        kod: (icerik.iade_kargo_kodu ?? '').trim(),
      }}
      kargoFirmalari={KARGO_FIRMALARI.map((f) => f.ad)}
    />
  )
}
