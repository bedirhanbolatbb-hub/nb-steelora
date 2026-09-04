import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { adAnahtari } from '@/lib/catalog/adAnahtari'
import { groupProducts } from '@/lib/catalog/variants'
import { LISTING_COLUMNS } from '@/lib/catalog/listing'

/**
 * Ad çakışması taraması (Faz 11A-FIX · F3).
 *
 * İsim kampanyası v2 elle yürütülmüştü; sonucu ölçen bir araç yoktu, bu yüzden
 * sonradan doğan çakışmalar (NBB094 / NBB121) ancak gözle fark edildi. Bu uç,
 * vitrindeki KARTLARI grupladıktan sonra aynı ada düşenleri döndürür — panelin
 * ad alanındaki bekçi (bkz. products/[id]/route.ts) ile aynı karşılaştırmayı
 * kullanır, iki yer ayrışamaz.
 *
 * Yalnız okur, hiçbir şey yazmaz.
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products_display')
    .select(`${LISTING_COLUMNS}, trendyol_barcode`)
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const kartlar = groupProducts((data || []) as any[])
  const kova = new Map<string, { ad: string; kartlar: { kod: string; slug: string; uye: number }[] }>()

  for (const g of kartlar) {
    const ad = (g.cover.display_title as string) || ''
    const anahtar = adAnahtari(ad)
    if (!anahtar) continue
    if (!kova.has(anahtar)) kova.set(anahtar, { ad, kartlar: [] })
    kova.get(anahtar)!.kartlar.push({
      kod: ((g.cover as any).trendyol_barcode as string) || '—',
      slug: (g.cover.slug as string) || '',
      uye: g.members.length,
    })
  }

  const cakisan = [...kova.values()]
    .filter((k) => k.kartlar.length > 1)
    .sort((a, b) => b.kartlar.length - a.kartlar.length)

  return NextResponse.json({
    aktifUrun: (data || []).length,
    kart: kartlar.length,
    cakisanGrup: cakisan.length,
    etkilenenKart: cakisan.reduce((t, k) => t + k.kartlar.length, 0),
    gruplar: cakisan,
  })
}
