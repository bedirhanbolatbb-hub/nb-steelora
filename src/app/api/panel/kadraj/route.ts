import { NextResponse, after } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { KADRAJ_ANAHTARI, KADRAJ_KAPALI_ANAHTARI, kapaliListesiniCoz } from '@/lib/gorsel/kadrajAyari'
import { vitriniYenile } from '@/lib/cache/vitrin'

export const dynamic = 'force-dynamic'

/**
 * Vitrin kadrajı ayarı — panel karşılığı (Faz 35).
 *
 *   { genel: 'acik' | 'kapali' }            → tüm vitrin için anahtar
 *   { urunId: '<uuid>', kapali: boolean }   → tek üründe kapat / geri aç
 *
 * Değerler site_content'e yazılır (anahtar yoksa oluşturulur). Vitrin kabuğu
 * site_content'i 2 dakikalık önbellekle okur; değişiklik en geç o kadar sürede yansır.
 */
export async function POST(request: Request) {
  after(vitriniYenile) // vitrin önbelleğini yanıt sonrası tazeler (lib/cache/vitrin)
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const supabase = createServiceClient()

  if (body?.genel === 'acik' || body?.genel === 'kapali') {
    const { error } = await supabase
      .from('site_content')
      .upsert({ key: KADRAJ_ANAHTARI, value: body.genel }, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, genel: body.genel })
  }

  const urunId = typeof body?.urunId === 'string' ? body.urunId.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(urunId) || typeof body?.kapali !== 'boolean') {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }
  const { data } = await supabase.from('site_content').select('value').eq('key', KADRAJ_KAPALI_ANAHTARI).maybeSingle()
  const liste = new Set(kapaliListesiniCoz(data?.value))
  if (body.kapali) liste.add(urunId)
  else liste.delete(urunId)
  const { error } = await supabase
    .from('site_content')
    .upsert({ key: KADRAJ_KAPALI_ANAHTARI, value: JSON.stringify([...liste]) }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, kapali: body.kapali, toplamKapali: liste.size })
}
