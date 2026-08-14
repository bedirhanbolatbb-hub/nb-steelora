import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminSelectableOrderStatuses } from '@/lib/orders/statusTransitions'
import SiparisDetayClient from './SiparisDetayClient'

export const metadata: Metadata = { title: 'Sipariş detayı' }
export const dynamic = 'force-dynamic'

export default async function PanelSiparisDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (!o) notFound()

  // Kalemlerdeki ürünlerin güncel görsel/slug bilgisi (görüntüleme için).
  const itemler = Array.isArray(o.items) ? (o.items as any[]) : []
  const productIds = itemler.map((i) => i?.productId ?? i?.product_id).filter((x) => x && x !== 'KARGO')
  let urunler: Record<string, { slug: string; image: string | null }> = {}
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, slug, override_images, trendyol_images')
      .in('id', productIds)
    urunler = Object.fromEntries(
      (data || []).map((p: any) => [
        p.id,
        {
          slug: p.slug,
          image:
            (p.override_images as string[] | null)?.[0] ??
            (p.trendyol_images as string[] | null)?.[0] ??
            null,
        },
      ])
    )
  }

  // Uygulanan kampanya (indirim satırında kod göstermek için)
  let kuponKodu: string | null = null
  if (o.applied_campaign_id) {
    const { data: kampanya } = await supabase
      .from('campaigns')
      .select('code, name')
      .eq('id', o.applied_campaign_id)
      .maybeSingle()
    kuponKodu = kampanya?.code || kampanya?.name || null
  }

  return (
    <SiparisDetayClient
      siparis={{
        id: o.id,
        no: o.order_number ?? '—',
        durum: o.status ?? 'pending',
        secilebilirDurumlar: getAdminSelectableOrderStatuses(o.status),
        email: o.guest_email ?? null,
        items: itemler
          .filter((i) => (i?.productId ?? i?.product_id) !== 'KARGO')
          .map((i: any) => {
            const pid = i?.productId ?? i?.product_id
            return {
              ad: i?.name ?? '—',
              adet: Number(i?.quantity || 1),
              birim: Number(i?.price || 0),
              slug: urunler[pid]?.slug ?? null,
              image: urunler[pid]?.image ?? null,
            }
          }),
        araToplam: Number(o.subtotal || 0),
        kargo: Number(o.shipping_cost || 0),
        indirim: Number(o.discount_amount || 0),
        kuponKodu,
        toplam: Number(o.total || 0),
        adres: (o.shipping_address as any) ?? null,
        hediyeNotu: o.gift_note ?? null,
        iyzicoId: o.iyzico_payment_id ?? null,
        takipNo: o.tracking_number ?? null,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        stockDeductedAt: o.stock_deducted_at,
        stockRestoredAt: o.stock_restored_at,
        paymentRefundedAt: o.payment_refunded_at,
        reviewInviteSentAt: o.review_invite_sent_at,
      }}
    />
  )
}
