import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/** Yeni koleksiyon: ad + slug (yalnız oluştururken serbest) + açıklama. */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const slug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() || null : null

  if (!name) return NextResponse.json({ error: 'Ad zorunlu' }, { status: 400 })
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug yalnız küçük harf, rakam ve tire içerebilir (ör. yaz-secksisi)' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()
  const { data: mevcut } = await supabase.from('collections').select('id').eq('slug', slug).maybeSingle()
  if (mevcut) return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 409 })

  const { data: sonSira } = await supabase
    .from('collections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('collections')
    .insert({
      name,
      slug,
      description,
      product_ids: [],
      is_active: true,
      sort_order: (sonSira?.sort_order ?? 0) + 1,
    })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, slug: data.slug })
}
