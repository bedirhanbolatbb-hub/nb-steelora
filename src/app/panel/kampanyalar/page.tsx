import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import KampanyalarClient, { type KampanyaSatiri } from './KampanyalarClient'

export const metadata: Metadata = { title: 'Kampanyalar' }
export const dynamic = 'force-dynamic'

export default async function PanelKampanyalarPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  const satirlar: KampanyaSatiri[] = (data || []).map((c: any) => ({
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
  }))

  return <KampanyalarClient satirlar={satirlar} />
}
