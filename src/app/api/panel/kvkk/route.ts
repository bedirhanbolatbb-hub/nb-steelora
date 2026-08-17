import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * KVKK veri talepleri (panel → Ayarlar) — Faz 12.
 *   GET  ?visitor_id= veya ?email=  → rıza kayıtlarını ve olay sayısını listeler
 *   POST { visitor_id }             → o kimliğe bağlı analitik izleri anonimleştirir
 * Ödeme/sipariş kayıtlarına DOKUNULMAZ (yasal saklama yükümlülüğü).
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const visitorId = (sp.get('visitor_id') || '').trim()
  const email = (sp.get('email') || '').trim().toLowerCase()
  const supabase = createServiceClient()

  if (!visitorId && !email) {
    return NextResponse.json({ error: 'visitor_id ya da e-posta gerekli' }, { status: 400 })
  }

  // E-posta ile arandığında sipariş kayıtlarından bağlam verilir; analitik
  // tarafında e-posta hiç tutulmaz, bu yüzden olay eşleşmesi visitor_id ister.
  let siparisSayisi = 0
  if (email) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('guest_email', email)
    siparisSayisi = count ?? 0
  }

  let rizalar: any[] = []
  let olaySayisi = 0
  if (visitorId) {
    const { data } = await supabase
      .from('consent_logs')
      .select('categories, version, occurred_at, source')
      .eq('visitor_id', visitorId)
      .order('occurred_at', { ascending: false })
      .limit(20)
    rizalar = data || []

    const { count } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_id', visitorId)
    olaySayisi = count ?? 0
  }

  return NextResponse.json({
    visitorId: visitorId || null,
    email: email || null,
    rizalar,
    olaySayisi,
    siparisSayisi,
    not: email
      ? 'Analitik kayıtlarında e-posta tutulmaz; olay silme için ziyaretçi kimliği gerekir.'
      : null,
  })
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const visitorId = String(body?.visitor_id || '').trim()
  if (!visitorId) return NextResponse.json({ error: 'visitor_id gerekli' }, { status: 400 })

  const supabase = createServiceClient()
  const { count } = await supabase
    .from('analytics_events')
    .select('id', { count: 'exact', head: true })
    .eq('visitor_id', visitorId)

  const { error } = await supabase
    .from('analytics_events')
    .update({ visitor_id: null })
    .eq('visitor_id', visitorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Rıza kaydı kanıt olduğu için silinmez; talebin kendisi de kaydedilir.
  await supabase.from('consent_logs').insert({
    visitor_id: visitorId,
    categories: { zorunlu: true, analitik_gelismis: false, pazarlama: false },
    version: 'kvkk-silme-talebi',
    source: 'geri_alma',
  })

  return NextResponse.json({ ok: true, anonimlestirilen: count ?? 0 })
}
