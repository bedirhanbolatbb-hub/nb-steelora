import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const supabase = await createClient()

  if (type === 'product') {
    const { error } = await supabase
      .from('products')
      .update({
        override_title: body.override_title,
        override_price: body.override_price,
        override_description: body.override_description,
        is_featured: body.is_featured,
        is_active: body.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Default: update order status
  const { error } = await supabase
    .from('orders')
    .update({
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
