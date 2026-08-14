import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import UrunlerClient, { type UrunSatiri } from './UrunlerClient'

export const metadata: Metadata = { title: 'Ürünler' }
export const dynamic = 'force-dynamic'

const SAYFA_BOYU = 50

export default async function PanelUrunlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = createServiceClient()

  let query = supabase
    .from('products')
    .select(
      'id, slug, override_title, trendyol_title, trendyol_barcode, trendyol_category, override_price, trendyol_price, trendyol_stock, is_active, badge, is_featured, gender, override_images, trendyol_images, updated_at',
      { count: 'exact' }
    )

  const q = (sp.q || '').trim()
  if (q.length >= 2) {
    const like = `%${q.replace(/[%_]/g, '')}%`
    query = query.or(
      `override_title.ilike.${like},trendyol_title.ilike.${like},trendyol_barcode.ilike.${like}`
    )
  }
  if (sp.kategori) query = query.eq('trendyol_category', sp.kategori)
  if (sp.gender === 'women' || sp.gender === 'men') query = query.eq('gender', sp.gender)
  else if (sp.gender === 'bos') query = query.is('gender', null)
  if (sp.durum === 'aktif') query = query.eq('is_active', true)
  else if (sp.durum === 'pasif') query = query.eq('is_active', false)
  if (sp.stok === '1') query = query.eq('trendyol_stock', 1)
  else if (sp.stok === 'tukenen') query = query.eq('trendyol_stock', 0)
  if (sp.isaret === 'rozetli') query = query.not('badge', 'is', null)
  else if (sp.isaret === 'one-cikan') query = query.eq('is_featured', true)
  else if (sp.isaret === 'override') query = query.not('override_title', 'is', null)

  // Sıralama: ad için override_title (boşlar sona) + trendyol_title ikincil;
  // fiyat sync fiyatına göredir (override_price nadir, kolon coalesce basar).
  switch (sp.sira) {
    case 'ad':
      query = query
        .order('override_title', { ascending: true, nullsFirst: false })
        .order('trendyol_title', { ascending: true })
      break
    case 'fiyat':
      query = query.order('trendyol_price', { ascending: false })
      break
    case 'stok':
      query = query.order('trendyol_stock', { ascending: true })
      break
    default:
      query = query.order('updated_at', { ascending: false })
  }

  const sayfa = Math.max(1, parseInt(sp.sayfa || '1'))
  const from = (sayfa - 1) * SAYFA_BOYU
  const { data, count } = await query.range(from, from + SAYFA_BOYU - 1)

  const satirlar: UrunSatiri[] = (data || []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.override_title || p.trendyol_title,
    tyTitle: p.trendyol_title,
    barcode: p.trendyol_barcode,
    category: p.trendyol_category,
    price: Number(p.override_price ?? p.trendyol_price ?? 0),
    stock: p.trendyol_stock ?? 0,
    active: Boolean(p.is_active),
    badge: p.badge || null,
    featured: Boolean(p.is_featured),
    hasOverride: Boolean(p.override_title),
    image:
      (p.override_images as string[] | null)?.[0] ??
      (p.trendyol_images as string[] | null)?.[0] ??
      null,
  }))

  // Filtre listesi için kategoriler
  const { data: kategoriData } = await supabase
    .from('products')
    .select('trendyol_category')
    .not('trendyol_category', 'is', null)
  const kategoriler = [...new Set((kategoriData || []).map((r: any) => r.trendyol_category))].sort(
    (a, b) => String(a).localeCompare(String(b), 'tr')
  )

  return (
    <UrunlerClient
      satirlar={satirlar}
      toplam={count ?? 0}
      sayfa={sayfa}
      sayfaBoyu={SAYFA_BOYU}
      kategoriler={kategoriler as string[]}
      params={{
        q,
        kategori: sp.kategori || '',
        gender: sp.gender || '',
        durum: sp.durum || '',
        stok: sp.stok || '',
        isaret: sp.isaret || '',
        sira: sp.sira || '',
      }}
    />
  )
}
