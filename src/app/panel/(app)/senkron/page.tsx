import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { getGroupKey } from '@/lib/catalog/variants'
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

  const { count: pasif } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', false)

  // "Trendyol'da 426 ürün var, bizde 432" farkının kaynağı (Faz 18 ölçümü):
  // Trendyol paneli bir ürünü TEK kart (content) sayar, biz her barkodu ayrı
  // satır tutarız. Beden varyantlı iki yüzük ailesi 8 satır ama 2 karttır;
  // 432 − 8 + 2 = 426. Eksik ürün YOK. Sayı elle yazılmıyor, veriden türüyor.
  const { data: varyantlar } = await supabase
    .from('products')
    .select('id, trendyol_title, override_title, trendyol_price, override_price, trendyol_category, gender, variant_label')
    .eq('is_active', true)
    .not('variant_label', 'is', null)

  const varyantSatiri = (varyantlar ?? []).length
  const varyantGrubu = new Set(
    (varyantlar ?? []).map((v: any) =>
      getGroupKey({
        id: v.id,
        display_title: v.override_title ?? v.trendyol_title,
        display_price: v.override_price ?? v.trendyol_price,
        trendyol_category: v.trendyol_category,
        gender: v.gender,
      })
    )
  ).size

  return (
    <SenkronClient
      kosular={kosular}
      aktifUrun={aktif ?? 0}
      pasifUrun={pasif ?? 0}
      trendyolKarti={(aktif ?? 0) - varyantSatiri + varyantGrubu}
      varyantSatiri={varyantSatiri}
      varyantGrubu={varyantGrubu}
    />
  )
}
