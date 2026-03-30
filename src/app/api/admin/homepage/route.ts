import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('homepage_settings')
    .select('*')
    .eq('section', 'featured')
    .single()

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = getServiceClient()

  // Upsert: varsa güncelle, yoksa ekle
  const { data: existing } = await supabase
    .from('homepage_settings')
    .select('id')
    .eq('section', body.section)
    .single()

  if (existing) {
    await supabase
      .from('homepage_settings')
      .update({
        product_ids: body.product_ids,
        updated_at: new Date().toISOString(),
      })
      .eq('section', body.section)
  } else {
    await supabase.from('homepage_settings').insert({
      section: body.section,
      product_ids: body.product_ids,
    })
  }

  return NextResponse.json({ success: true })
}
