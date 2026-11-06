import type { Metadata } from 'next'
import { beyanEdilenMalzemeMi } from '@/lib/catalog/material'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import UrunDetayClient from './UrunDetayClient'
import VitrinKadraji from './VitrinKadraji'
import { KADRAJ_ANAHTARI, KADRAJ_KAPALI_ANAHTARI, kadrajAyariniOku } from '@/lib/gorsel/kadrajAyari'

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

  // Faz 35: vitrin kadrajı ayarı (genel + bu ürün)
  const { data: kadrajSatirlari } = await supabase
    .from('site_content')
    .select('key, value')
    .in('key', [KADRAJ_ANAHTARI, KADRAJ_KAPALI_ANAHTARI])
  const kadraj = kadrajAyariniOku(Object.fromEntries((kadrajSatirlari ?? []).map((r) => [r.key, r.value])))
  const ilkGorsel =
    ((p.override_images as string[] | null) ?? [])[0] ?? ((p.trendyol_images as string[] | null) ?? [])[0] ?? null

  return (
    <UrunDetayClient
      kadrajKarti={
        <VitrinKadraji
          urunId={p.id}
          gorsel={ilkGorsel}
          genelAcik={kadraj.acik}
          urundeKapali={kadraj.kapaliIdler.includes(p.id)}
        />
      }
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
        materialType: beyanEdilenMalzemeMi(p.material_type) ? p.material_type : '',
        gender: p.gender === 'women' || p.gender === 'men' ? p.gender : '',
        note: p.note ?? '',
      }}
    />
  )
}
