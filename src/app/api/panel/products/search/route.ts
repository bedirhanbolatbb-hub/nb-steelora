import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Panel ürün seçicisi (koleksiyon + kürasyon): ada ve barkoda göre arama.
 * Pasif ürünler de döner — seçici uyarı rozetiyle gösterir.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json([])

  const supabase = createServiceClient()
  const like = `%${q.replace(/[%_]/g, '')}%`
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, override_title, trendyol_title, trendyol_barcode, trendyol_images, override_images, trendyol_stock, is_active')
    .or(`override_title.ilike.${like},trendyol_title.ilike.${like},trendyol_barcode.ilike.${like}`)
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.override_title || p.trendyol_title,
      barcode: p.trendyol_barcode,
      image: (p.override_images as string[] | null)?.[0] ?? (p.trendyol_images as string[] | null)?.[0] ?? null,
      stock: p.trendyol_stock ?? 0,
      active: Boolean(p.is_active),
    }))
  )
}
