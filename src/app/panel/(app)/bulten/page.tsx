import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import BultenClient, { type AboneSatiri } from './BultenClient'

export const metadata: Metadata = { title: 'Bülten' }
export const dynamic = 'force-dynamic'

export default async function PanelBultenPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('newsletter_subscribers')
    .select('id, email, subscribed_at, consented_at, is_active, source')
    .order('subscribed_at', { ascending: false })
    .limit(1000)

  const satirlar: AboneSatiri[] = (data || []).map((a: any) => ({
    id: a.id,
    email: a.email,
    tarih: a.subscribed_at,
    rizali: Boolean(a.consented_at),
    aktif: Boolean(a.is_active),
    kaynak: a.source ?? null,
  }))

  return <BultenClient satirlar={satirlar} />
}
