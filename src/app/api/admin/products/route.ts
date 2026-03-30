import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) + '-' + Date.now().toString(36)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = getServiceClient()

  const slug = generateSlug(body.title)
  const images = body.images
    ? body.images.split(',').map((u: string) => u.trim()).filter(Boolean)
    : []

  const { data, error } = await supabase
    .from('products')
    .insert({
      trendyol_id: `manual-${Date.now()}`,
      slug,
      trendyol_title: body.title,
      trendyol_description: body.description || '',
      trendyol_price: Number(body.price),
      trendyol_stock: Number(body.stock) || 0,
      trendyol_images: images,
      trendyol_category: body.category,
      trendyol_barcode: `MAN-${Date.now()}`,
      override_title: body.title,
      override_price: body.salePrice ? Number(body.salePrice) : null,
      override_description: body.longDescription || null,
      is_active: body.isActive !== false,
      is_featured: false,
      last_synced_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
