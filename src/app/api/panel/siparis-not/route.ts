import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Sipariş iç notları (Faz 11D).
 *
 * GERÇEK OLAY: müşteri WhatsApp'tan "kargo maili ulaşmadı" yazdı; günler
 * sonra kimin ne dediği, ne yapıldığı hiçbir yerde yoktu. Artık panelde,
 * siparişin yanında zaman damgalı iç not tutulur. MÜŞTERİYE HİÇBİR YERDE
 * GÖSTERİLMEZ — yalnız panel okur.
 *
 * Sıfır-DDL: notlar orders.metadata.panel_notlari dizisinde durur
 * [{ t: ISO damga, m: metin }].
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const orderId = String(body?.orderId ?? '').trim()
  const metin = String(body?.metin ?? '').trim().slice(0, 1000)
  if (!orderId || !metin) {
    return NextResponse.json({ error: 'Sipariş ve not metni zorunlu' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })

  const mevcut = (data.metadata as Record<string, unknown>) ?? {}
  const notlar = Array.isArray(mevcut.panel_notlari) ? mevcut.panel_notlari : []
  const yeni = [...notlar, { t: new Date().toISOString(), m: metin }]
  const { error } = await supabase
    .from('orders')
    .update({ metadata: { ...mevcut, panel_notlari: yeni } })
    .eq('id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** Not silme — yanlış girilen kayıt düzeltilebilsin (damgayla adreslenir). */
export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  const orderId = String(body?.orderId ?? '').trim()
  const damga = String(body?.t ?? '').trim()
  if (!orderId || !damga) return NextResponse.json({ error: 'Eksik istek' }, { status: 400 })

  const supabase = createServiceClient()
  const { data } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })

  const mevcut = (data.metadata as Record<string, unknown>) ?? {}
  const notlar = Array.isArray(mevcut.panel_notlari) ? mevcut.panel_notlari : []
  const yeni = notlar.filter((n: { t?: string }) => n?.t !== damga)
  const { error } = await supabase
    .from('orders')
    .update({ metadata: { ...mevcut, panel_notlari: yeni } })
    .eq('id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
