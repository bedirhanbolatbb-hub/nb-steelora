import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Koleksiyon düzenleme: ad, açıklama, product_ids.
 * slug DEĞİŞMEZ — canlı URL; gövdede gelirse istek reddedilir.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Geçersiz gövde' }, { status: 400 })
  }
  if ('slug' in body) {
    return NextResponse.json({ error: 'Slug değiştirilemez (canlı URL)' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Ad boş olamaz' }, { status: 400 })
    patch.name = name
  }
  if ('description' in body) {
    patch.description = typeof body.description === 'string' ? body.description.trim() || null : null
  }
  if ('product_ids' in body) {
    const ids = body.product_ids
    if (!Array.isArray(ids) || !ids.every((x: unknown) => typeof x === 'string') || ids.length > 100) {
      return NextResponse.json({ error: 'Geçersiz ürün listesi' }, { status: 400 })
    }
    patch.product_ids = [...new Set(ids)]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Değişen alan yok' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('collections')
    .update(patch)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Koleksiyon bulunamadı' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
