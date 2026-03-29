import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('id')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '4')

  if (!productId || !category) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('products_display')
    .select('id, slug, display_title, display_price, display_images, trendyol_category, trendyol_stock, trendyol_barcode, trendyol_id, trendyol_description, trendyol_price, trendyol_images, override_title, override_description, override_price, override_images, collection_id, is_active, is_featured, badge, created_at, updated_at, last_synced_at')
    .ilike('trendyol_category', `%${category}%`)
    .neq('id', productId)
    .limit(limit * 2)

  const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, limit)

  return NextResponse.json(shuffled)
}
