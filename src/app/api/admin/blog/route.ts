import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, published, published_at, read_time, meta_title, meta_description, content')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const { id, title, slug, excerpt, content, cover_image, meta_title, meta_description, read_time, published } = body

  if (!title || !slug || !content) {
    return NextResponse.json({ error: 'title, slug ve content zorunlu' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const payload: any = {
    title, slug, excerpt: excerpt || null, content,
    cover_image: cover_image || null,
    meta_title: meta_title || null,
    meta_description: meta_description || null,
    read_time: read_time || 5,
    published: !!published,
    updated_at: new Date().toISOString(),
  }
  if (published && !id) payload.published_at = new Date().toISOString()

  let result
  if (id) {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    if (published) payload.published_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(payload)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  return NextResponse.json(result)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
