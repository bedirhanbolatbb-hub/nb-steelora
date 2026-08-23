import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { CATEGORIES } from '@/lib/catalog/categories'
import { golgeDurumu, type GolgeKampanyasi } from '@/lib/campaigns/golge'
import KampanyalarClient, { type KampanyaSatiri } from './KampanyalarClient'

export const metadata: Metadata = { title: 'Kampanyalar' }
export const dynamic = 'force-dynamic'

export default async function PanelKampanyalarPage() {
  const supabase = createServiceClient()

  const [kampanyaRes, hedefRes, kademeRes, koleksiyonRes, siparisRes] = await Promise.all([
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    supabase.from('campaign_targets').select('campaign_id, target_type, category_value, collection_id, product_id'),
    supabase.from('campaign_tiers').select('campaign_id, min_amount, discount_value'),
    supabase.from('collections').select('id, slug, name').eq('is_active', true).order('sort_order'),
    // Kampanya performansı: hangi kampanya kaç siparişte kullanıldı, ne kadar
    // indirim üretti, ne kadar ciro getirdi (iptaller hariç).
    supabase
      .from('orders')
      .select('applied_campaign_id, discount_amount, total, status')
      .not('applied_campaign_id', 'is', null),
  ])

  // v2 tabloları kurulmadıysa panel yine açılır, uyarı gösterilir.
  const v2Hazir = !hedefRes.error && !kademeRes.error

  const hedefHaritasi = new Map<string, string[]>()
  for (const h of hedefRes.data ?? []) {
    const liste = hedefHaritasi.get(h.campaign_id) ?? []
    liste.push(String(h.category_value ?? h.collection_id ?? h.product_id ?? ''))
    hedefHaritasi.set(h.campaign_id, liste.filter(Boolean))
  }

  const kademeHaritasi = new Map<string, { minTutar: number; oran: number }[]>()
  for (const t of kademeRes.data ?? []) {
    const liste = kademeHaritasi.get(t.campaign_id) ?? []
    liste.push({ minTutar: Number(t.min_amount) || 0, oran: Number(t.discount_value) || 0 })
    kademeHaritasi.set(
      t.campaign_id,
      liste.sort((a, b) => a.minTutar - b.minTutar)
    )
  }

  const performans = new Map<string, { siparis: number; indirim: number; ciro: number }>()
  for (const o of siparisRes.data ?? []) {
    if (o.status === 'cancelled') continue
    const k = String(o.applied_campaign_id)
    const mevcut = performans.get(k) ?? { siparis: 0, indirim: 0, ciro: 0 }
    mevcut.siparis += 1
    mevcut.indirim += Number(o.discount_amount) || 0
    mevcut.ciro += Number(o.total) || 0
    performans.set(k, mevcut)
  }

  const satirlar: KampanyaSatiri[] = (kampanyaRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    code: c.code,
    discountType: c.discount_type === 'fixed' ? 'fixed' : 'percent',
    discountValue: c.discount_value != null ? Number(c.discount_value) : null,
    minCart: Number(c.min_cart_amount || 0),
    maxUses: c.max_uses != null ? Number(c.max_uses) : null,
    usedCount: Number(c.used_count || 0),
    bannerText: c.banner_text,
    bannerColor: c.banner_color,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    isActive: Boolean(c.is_active),
    metadata: c.metadata ?? null,
    // v2
    scope: c.scope ?? 'cart',
    hedefler: hedefHaritasi.get(c.id) ?? [],
    kademeler: kademeHaritasi.get(c.id) ?? [],
    minItemCount: c.min_item_count != null ? Number(c.min_item_count) : null,
    perUserLimit: c.per_user_limit != null ? Number(c.per_user_limit) : null,
    combinable: Boolean(c.combinable),
    membersOnly: Boolean(c.members_only),
    firstOrderOnly: Boolean(c.first_order_only),
    buyQuantity: c.buy_quantity != null ? Number(c.buy_quantity) : null,
    payQuantity: c.pay_quantity != null ? Number(c.pay_quantity) : null,
    priority: c.priority != null ? Number(c.priority) : 100,
    performans: performans.get(c.id) ?? { siparis: 0, indirim: 0, ciro: 0 },
  }))

  // Gölgeleme uyarısı (Faz 25): hiçbir sepette kazanamayacak kampanyayı
  // panelde göster. HOSGELDIN10 aylarca aktifti ama NB30 (%30) yüzünden bir
  // kez bile uygulanmadı; bunu görmenin yolu yoktu.
  const golgeGirdileri: GolgeKampanyasi[] = (kampanyaRes.data || []).map((c: any) => ({
    id: c.id,
    ad: c.name,
    indirimTipi: c.discount_type,
    deger: c.discount_value != null ? Number(c.discount_value) : null,
    kapsam: c.scope ?? 'cart',
    birlesebilir: Boolean(c.combinable),
    koduVar: Boolean(c.requires_code) || c.type === 'discount_code',
    aktif: Boolean(c.is_active),
    baslangic: c.starts_at,
    bitis: c.ends_at,
    minSepet: Number(c.min_cart_amount || 0),
  }))
  for (const satir of satirlar) {
    const g = golgeDurumu(
      golgeGirdileri.find((x) => x.id === satir.id)!,
      golgeGirdileri
    )
    satir.golgeleyen = g.golgeliMi ? (g.golgeleyenAd ?? null) : null
  }

  return (
    <KampanyalarClient
      satirlar={satirlar}
      v2Hazir={v2Hazir}
      kategoriler={CATEGORIES.map((k) => ({ slug: k.slug, title: k.title }))}
      koleksiyonlar={(koleksiyonRes.data ?? []).map((k: any) => ({ id: k.id, slug: k.slug, ad: k.name }))}
    />
  )
}
