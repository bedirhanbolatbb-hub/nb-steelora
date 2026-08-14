import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import SenkronClient, { type KosuSatiri } from './SenkronClient'

export const metadata: Metadata = { title: 'Senkron' }
export const dynamic = 'force-dynamic'

export default async function PanelSenkronPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('sync_log')
    .select('id, run_id, status, synced_at, finished_at, pages_done, products_added, products_updated, error_message')
    .order('synced_at', { ascending: false })
    .limit(30)

  const kosular: KosuSatiri[] = (data || []).map((r: any) => ({
    id: r.id,
    durum: r.status ?? 'running',
    baslangic: r.synced_at,
    sureSn:
      r.finished_at && r.synced_at
        ? Math.round((new Date(r.finished_at).getTime() - new Date(r.synced_at).getTime()) / 1000)
        : null,
    sayfa: Number(r.pages_done || 0),
    eklenen: Number(r.products_added || 0),
    guncellenen: Number(r.products_updated || 0),
    hata: r.error_message ?? null,
  }))

  const { count: aktif } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  return <SenkronClient kosular={kosular} aktifUrun={aktif ?? 0} />
}
