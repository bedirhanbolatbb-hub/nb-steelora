import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import KurasyonClient, { type KurasyonUrun, type PanelSlayt } from './KurasyonClient'

export const metadata: Metadata = { title: 'Kürasyon' }
export const dynamic = 'force-dynamic'

const BOLUMLER = [
  'featured',
  'new_arrivals',
  'category_kolye',
  'category_kupe',
  'category_bileklik',
  'category_yuzuk',
  'category_piercing',
  'category_erkek',
  'category_setler',
]

export default async function PanelKurasyonPage() {
  const supabase = createServiceClient()

  const [{ data: settings }, { data: slidesRow }, { data: koleksiyonlar }] = await Promise.all([
    supabase.from('homepage_settings').select('section, product_ids, payload').in('section', BOLUMLER),
    supabase.from('homepage_settings').select('payload').eq('section', 'hero_slides').maybeSingle(),
    supabase.from('collections').select('slug, name').eq('is_active', true).order('sort_order'),
  ])

  const bolumler: Record<string, string[]> = Object.fromEntries(BOLUMLER.map((b) => [b, []]))
  const kategoriGorselleri: Record<string, string | null> = {}
  for (const row of settings || []) {
    bolumler[row.section] = (row.product_ids || []) as string[]
    if (row.section.startsWith('category_')) {
      kategoriGorselleri[row.section] = row.payload?.image_url ?? null
    }
  }

  const tumIdler = [...new Set(Object.values(bolumler).flat())]
  let urunler: Record<string, KurasyonUrun> = {}
  if (tumIdler.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, slug, override_title, trendyol_title, trendyol_barcode, override_images, trendyol_images, trendyol_stock, is_active')
      .in('id', tumIdler)
    urunler = Object.fromEntries(
      (products || []).map((p: any) => [
        p.id,
        {
          id: p.id,
          slug: p.slug,
          title: p.override_title || p.trendyol_title,
          barcode: p.trendyol_barcode,
          image:
            (p.override_images as string[] | null)?.[0] ??
            (p.trendyol_images as string[] | null)?.[0] ??
            null,
          stock: p.trendyol_stock ?? 0,
          active: Boolean(p.is_active),
        },
      ])
    )
  }

  const slaytlar: PanelSlayt[] = Array.isArray(slidesRow?.payload?.slides)
    ? slidesRow!.payload.slides
    : []

  return (
    <KurasyonClient
      bolumler={bolumler}
      urunler={urunler}
      slaytlar={slaytlar}
      kategoriGorselleri={kategoriGorselleri}
      koleksiyonlar={(koleksiyonlar || []).map((k: any) => ({ slug: k.slug, name: k.name }))}
    />
  )
}
