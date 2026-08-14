import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import KurasyonClient, { type KurasyonUrun } from './KurasyonClient'

export const metadata: Metadata = { title: 'Kürasyon' }
export const dynamic = 'force-dynamic'

const BOLUMLER = ['hero_top', 'hero_bottom_left', 'hero_bottom_right', 'featured', 'new_arrivals']

export default async function PanelKurasyonPage() {
  const supabase = createServiceClient()

  const { data: settings } = await supabase
    .from('homepage_settings')
    .select('section, product_ids')
    .in('section', BOLUMLER)

  const bolumler: Record<string, string[]> = Object.fromEntries(BOLUMLER.map((b) => [b, []]))
  for (const row of settings || []) {
    bolumler[row.section] = (row.product_ids || []) as string[]
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

  return <KurasyonClient bolumler={bolumler} urunler={urunler} />
}
