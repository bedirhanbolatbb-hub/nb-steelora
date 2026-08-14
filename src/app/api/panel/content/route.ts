import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/** Site metni güncelleme — anahtar mevcutsa yazar, yeni anahtar üretmez. */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const key = typeof body?.key === 'string' ? body.key.trim() : ''
  const value = typeof body?.value === 'string' ? body.value : ''
  if (!key) return NextResponse.json({ error: 'Anahtar zorunlu' }, { status: 400 })

  // Sosyal bağlantılar URL olmalı (boş = basılmaz).
  if (/_url$/.test(key) && value.trim()) {
    try {
      const u = new URL(value.trim())
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
    } catch {
      return NextResponse.json({ error: 'Geçerli bir adres girin (https://…)' }, { status: 400 })
    }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('site_content')
    .update({ value })
    .eq('key', key)
    .select('key')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Anahtar bulunamadı' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
