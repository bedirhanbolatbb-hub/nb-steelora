import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { donemCoz, raporUret } from '@/lib/analytics/report'
import AnalizClient from './AnalizClient'

export const metadata: Metadata = { title: 'Analiz' }
export const dynamic = 'force-dynamic'

export default async function PanelAnalizPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>
}) {
  const sp = await searchParams
  const donem = donemCoz(sp.donem || 'son7', sp.bas, sp.bit)
  const rapor = await raporUret(donem)

  // Ürün kimliklerini okunur ada çevir (rapor katmanı yalnız kimlikle çalışır).
  const idler = [...new Set([...rapor.urunler, ...rapor.firsatlar, ...rapor.favoriler].map((u) => u.productId))]
  let adlar: Record<string, { ad: string; slug: string }> = {}
  if (idler.length > 0) {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('products')
      .select('id, slug, override_title, trendyol_title')
      .in('id', idler)
    adlar = Object.fromEntries(
      (data || []).map((p: any) => [p.id, { ad: p.override_title || p.trendyol_title || p.slug, slug: p.slug }])
    )
  }

  return <AnalizClient rapor={rapor} secili={sp.donem || 'son7'} adlar={adlar} />
}
