import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Bir üyenin site hareketi kayıtlarını siler (Faz 23-B · KVKK maddesi d).
 *
 * Yalnız `analytics_events` satırlarına dokunur: hesap, sipariş ve favoriler
 * korunur. KVKK silme talebinde hesabın tamamı silinecekse zaten
 * ON DELETE CASCADE bu satırları da götürür; bu uç, hesabını silmeden
 * "hareketlerimi silin" diyen üye için.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Geçersiz üye kimliği' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('analytics_events')
    .delete()
    .eq('user_id', id)
    .select('id')

  if (error) {
    // Sütun yoksa silinecek bir şey de yoktur; hata gibi göstermek yanıltır.
    if (error.code === '42703' || error.code === 'PGRST204') {
      return NextResponse.json({ ok: true, silinen: 0, not: 'user_id sütunu yok' })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, silinen: data?.length ?? 0 })
}
