import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import KuponlarClient, { type KuponSatiri, type KuponKampanyasi } from './KuponlarClient'

export const metadata: Metadata = { title: 'Kuponlar' }
export const dynamic = 'force-dynamic'

/**
 * Kupon takip ekranı (Faz 11E).
 *
 * BB üç şey istiyordu: yeni üyelere özel indirim, belirli kişilere özel kupon,
 * yalnız kendi verdiği kişilerin kullanacağı gizli kodlar. Motor tarafı zaten
 * vardı (campaign_coupons + sepetOzeti sahiplik doğrulaması); burada üretim ve
 * takip kapısı açılıyor: kim, ne zaman, kullandı mı, hangi siparişte.
 */
export default async function PanelKuponlarPage() {
  const supabase = createServiceClient()

  const [{ data: kuponlar }, { data: kampanyalar }] = await Promise.all([
    supabase
      .from('campaign_coupons')
      .select(
        'id, code, email, max_uses, used_count, expires_at, is_active, source, issued_at, redeemed_at, redeemed_order_id, created_at, campaigns(id, name, discount_type, discount_value, requires_code)'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('campaigns')
      .select('id, name, requires_code, discount_type, discount_value, is_active')
      .eq('requires_code', true)
      .order('created_at', { ascending: false }),
  ])

  // Kullanıldıysa hangi sipariş — numara panelde okunur olsun.
  const siparisIdleri = [
    ...new Set((kuponlar || []).map((k) => k.redeemed_order_id).filter(Boolean) as string[]),
  ]
  const siparisNo = new Map<string, string>()
  if (siparisIdleri.length) {
    const { data: siparisler } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('id', siparisIdleri)
    for (const s of siparisler || []) siparisNo.set(s.id, s.order_number)
  }

  const satirlar: KuponSatiri[] = (kuponlar || []).map((k) => {
    const kmp = k.campaigns as unknown as {
      id: string
      name: string
      discount_type: string | null
      discount_value: number | null
    } | null
    return {
      id: k.id,
      kod: k.code,
      eposta: k.email ?? '—',
      kampanyaAd: kmp?.name ?? '(silinmiş kampanya)',
      indirim:
        kmp?.discount_type === 'fixed'
          ? `${Number(kmp?.discount_value ?? 0)} ₺`
          : `%${Number(kmp?.discount_value ?? 0)}`,
      hak: Number(k.max_uses ?? 1),
      kullanilan: Number(k.used_count ?? 0),
      verildi: k.issued_at ?? k.created_at,
      sonKullanma: k.expires_at,
      kullanildi: k.redeemed_at,
      siparisNo: k.redeemed_order_id ? (siparisNo.get(k.redeemed_order_id) ?? null) : null,
      aktif: Boolean(k.is_active),
      kaynak: k.source ?? 'manual',
    }
  })

  const kampanyaListesi: KuponKampanyasi[] = (kampanyalar || []).map((c) => ({
    id: c.id,
    ad: c.name,
    indirim:
      c.discount_type === 'fixed'
        ? `${Number(c.discount_value ?? 0)} ₺`
        : `%${Number(c.discount_value ?? 0)}`,
    aktif: Boolean(c.is_active),
  }))

  return <KuponlarClient satirlar={satirlar} kampanyalar={kampanyaListesi} />
}
