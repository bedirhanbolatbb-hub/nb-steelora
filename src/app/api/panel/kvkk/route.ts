import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import {
  hesabiSilVeAnonimlestir,
  silmeEngeli,
  SILME_KAYNAK,
} from '@/lib/account/hesapSilme'

export const dynamic = 'force-dynamic'

/**
 * KVKK veri talepleri (panel → Ayarlar) — Faz 12.
 *   GET  ?visitor_id= veya ?email=  → rıza kayıtlarını ve olay sayısını listeler
 *   GET  ?silmeler=1                → son hesap silmelerini listeler (maskelenmiş)
 *   POST { visitor_id }             → o kimliğe bağlı analitik izleri anonimleştirir
 *   POST { eposta }                 → e-postayla gelen silme talebini işler
 * Sipariş kayıtları hiçbir yolda SİLİNMEZ; kişisel alanları maskelenerek
 * korunur (Vergi Usul Kanunu / TTK saklama yükümlülüğü). Müşterinin kendi
 * sildiği hesapla aynı işleyici kullanılır: lib/account/hesapSilme.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const visitorId = (sp.get('visitor_id') || '').trim()
  const email = (sp.get('email') || '').trim().toLowerCase()
  const supabase = createServiceClient()

  // Son hesap silmeleri: iz kayıtları kişisel veri taşımaz, yalnız kimlik
  // özeti ve zaman tutulur.
  if (sp.get('silmeler')) {
    const { data } = await supabase
      .from('consent_logs')
      .select('visitor_id, occurred_at, version')
      .eq('source', SILME_KAYNAK)
      .order('occurred_at', { ascending: false })
      .limit(25)
    return NextResponse.json({
      silmeler: (data || []).map((s) => ({
        kimlik: String(s.visitor_id ?? '').slice(0, 12) + '…',
        zaman: s.occurred_at,
        surum: s.version,
      })),
    })
  }

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

  // E-posta bir hesaba mı ait? (silme talebini panelden işleyebilmek için)
  let hesap: { id: string; eposta: string } | null = null
  if (email) hesap = await epostayaGoreHesap(email)

  return NextResponse.json({
    visitorId: visitorId || null,
    email: email || null,
    hesap,
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
  const eposta = String(body?.eposta || '').trim().toLowerCase()

  // E-postayla gelen silme talebi: müşterinin kendi sildiği akışla AYNI
  // işleyici çalışır, tek fark talebin panelden gelmesi.
  if (eposta) {
    const hesap = await epostayaGoreHesap(eposta)
    if (!hesap) return NextResponse.json({ error: 'Bu e-postayla hesap bulunamadı' }, { status: 404 })

    const engel = await silmeEngeli(hesap.id)
    if (engel) return NextResponse.json({ error: engel, engel: true }, { status: 409 })

    try {
      const sonuc = await hesabiSilVeAnonimlestir({
        userId: hesap.id,
        eposta: hesap.eposta,
        visitorId: String(body?.visitor_id || '').trim() || null,
        kaynak: 'panel',
      })
      return NextResponse.json({ ok: true, ozet: sonuc })
    } catch (hata: any) {
      console.error('[panel/kvkk] hesap silme hatası:', hata?.message)
      return NextResponse.json({ error: hata?.message ?? 'Silme tamamlanamadı' }, { status: 500 })
    }
  }

  const visitorId = String(body?.visitor_id || '').trim()
  if (!visitorId) return NextResponse.json({ error: 'visitor_id ya da eposta gerekli' }, { status: 400 })

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

/**
 * E-postaya göre auth kaydını bulur. GoTrue admin ucu ada göre filtre
 * desteklemediği için sayfalanarak taranır; kullanıcı sayısı küçük.
 */
async function epostayaGoreHesap(eposta: string): Promise<{ id: string; eposta: string } | null> {
  const supabase = createServiceClient()
  for (let sayfa = 1; sayfa <= 5; sayfa++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: sayfa, perPage: 200 })
    if (error || !data?.users?.length) return null
    const bulunan = data.users.find((u) => (u.email ?? '').toLowerCase() === eposta)
    if (bulunan) return { id: bulunan.id, eposta: bulunan.email ?? eposta }
    if (data.users.length < 200) return null
  }
  return null
}
