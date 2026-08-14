import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import KoleksiyonlarClient, { type KoleksiyonVeri, type UyeVeri } from './KoleksiyonlarClient'

export const metadata: Metadata = { title: 'Koleksiyonlar' }
export const dynamic = 'force-dynamic'

export default async function PanelKoleksiyonlarPage() {
  const supabase = createServiceClient()

  const { data: collections } = await supabase
    .from('collections')
    .select('id, name, slug, description, product_ids, is_active, sort_order')
    .order('sort_order', { ascending: true })

  // Tüm üye ürünler tek sorguda çözülür (ad, görsel, aktiflik).
  const tumIdler = [...new Set((collections || []).flatMap((c: any) => c.product_ids || []))]
  let uyeler: Record<string, UyeVeri> = {}
  if (tumIdler.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, slug, override_title, trendyol_title, trendyol_barcode, override_images, trendyol_images, trendyol_stock, is_active')
      .in('id', tumIdler)
    uyeler = Object.fromEntries(
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

  const veri: KoleksiyonVeri[] = (collections || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    productIds: (c.product_ids || []) as string[],
  }))

  return <KoleksiyonlarClient koleksiyonlar={veri} uyeler={uyeler} />
}
