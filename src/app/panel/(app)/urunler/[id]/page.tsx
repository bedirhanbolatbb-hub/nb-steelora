import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import UrunDetayClient from './UrunDetayClient'

export const metadata: Metadata = { title: 'Ürün düzenle' }
export const dynamic = 'force-dynamic'

export default async function PanelUrunDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: p } = await supabase
    .from('products')
    .select(
      'id, slug, trendyol_title, trendyol_price, trendyol_stock, trendyol_category, trendyol_barcode, trendyol_images, variant_label, last_synced_at, is_active, override_title, override_price, override_description, override_images, badge, is_featured, material_type, gender, note'
    )
    .eq('id', id)
    .maybeSingle()

  if (!p) notFound()

  return (
    <UrunDetayClient
      urun={{
        id: p.id,
        slug: p.slug,
        trendyolTitle: p.trendyol_title,
        trendyolPrice: Number(p.trendyol_price ?? 0),
        trendyolStock: p.trendyol_stock ?? 0,
        trendyolCategory: p.trendyol_category,
        trendyolBarcode: p.trendyol_barcode,
        trendyolImages: (p.trendyol_images as string[] | null) ?? [],
        variantLabel: p.variant_label,
        lastSyncedAt: p.last_synced_at,
        active: Boolean(p.is_active),
        overrideTitle: p.override_title ?? '',
        customPrice: p.override_price != null ? String(p.override_price) : '',
        overrideDescription: p.override_description ?? '',
        overrideImages: (p.override_images as string[] | null) ?? null,
        badge: p.badge ?? '',
        isFeatured: Boolean(p.is_featured),
        materialType: p.material_type === 'stainless_steel' || p.material_type === 'plated_brass' ? p.material_type : '',
        gender: p.gender === 'women' || p.gender === 'men' ? p.gender : '',
        note: p.note ?? '',
      }}
    />
  )
}
