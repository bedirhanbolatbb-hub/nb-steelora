import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/** Toplu işlem YALNIZ badge ve is_featured alanlarına dokunur. */
const ACTIONS = new Set(['set_badge', 'clear_badge', 'set_featured', 'clear_featured'])

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const ids: unknown = body?.ids
  const action: unknown = body?.action

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((x) => typeof x === 'string')) {
    return NextResponse.json({ error: 'Geçersiz ürün listesi' }, { status: 400 })
  }
  if (typeof action !== 'string' || !ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  }

  let patch: Record<string, unknown>
  if (action === 'set_badge') {
    const badge = typeof body?.badge === 'string' ? body.badge.trim() : ''
    if (!badge) return NextResponse.json({ error: 'Rozet metni boş' }, { status: 400 })
    patch = { badge }
  } else if (action === 'clear_badge') {
    patch = { badge: null }
  } else if (action === 'set_featured') {
    patch = { is_featured: true }
  } else {
    patch = { is_featured: false }
  }
  patch.updated_at = new Date().toISOString()

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('products').update(patch).in('id', ids).select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 })
}
