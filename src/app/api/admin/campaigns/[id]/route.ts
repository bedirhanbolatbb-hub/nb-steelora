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

  const table = type === 'review' ? 'reviews' : 'campaigns'
  const { error } = await supabase.from(table).update(body).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const supabase = await createClient()

  const table = type === 'review' ? 'reviews' : 'campaigns'
  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
