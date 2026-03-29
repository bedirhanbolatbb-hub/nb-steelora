import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('products_display')
    .select('id, slug, display_title, display_price, display_images, trendyol_category')
    .or(`display_title.ilike.%${q}%,trendyol_category.ilike.%${q}%`)
    .limit(8)

  return NextResponse.json(data || [])
}
