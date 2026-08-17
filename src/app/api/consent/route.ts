import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
  parseConsent,
  serializeConsent,
  type ConsentCategories,
} from '@/lib/analytics/consent'

export const dynamic = 'force-dynamic'

/**
 * Rıza kaydı (KVKK) — Faz 12.
 *
 * POST: tercihleri yazar. Analitik-gelişmiş AÇIKSA kalıcı ziyaretçi kimliği
 * (birinci taraf çerez) üretilir; KAPALIYSA varsa silinir ve o kimliğe bağlı
 * Katman B satırları anonimleştirilir (visitor_id NULL) — Katman A sayımı
 * bozulmaz, kanıt için consent_logs satırı her durumda yazılır.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const istenen = body?.categories ?? {}
  const kaynak = ['banner', 'ayarlar', 'geri_alma'].includes(String(body?.source))
    ? String(body.source)
    : 'banner'

  const kategoriler: ConsentCategories = {
    zorunlu: true,
    analitik_gelismis: Boolean(istenen.analitik_gelismis),
    // Bu fazda hiçbir piksel yok; seçim kaydedilir ama hiçbir şeyi tetiklemez.
    pazarlama: Boolean(istenen.pazarlama),
  }

  const cerezBasligi = request.headers.get('cookie') || ''
  const mevcutCerezler = Object.fromEntries(
    cerezBasligi.split(';').map((c) => {
      const i = c.indexOf('=')
      return i === -1 ? [c.trim(), ''] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]
    })
  )
  const eskiVisitorId = mevcutCerezler[VISITOR_COOKIE] || null

  let visitorId: string | null = null
  if (kategoriler.analitik_gelismis) {
    visitorId = eskiVisitorId || randomBytes(16).toString('hex')
  }

  const supabase = createServiceClient()

  // Rıza geri alındıysa Katman B izleri anonimleştirilir.
  if (!kategoriler.analitik_gelismis && eskiVisitorId) {
    const { error } = await supabase
      .from('analytics_events')
      .update({ visitor_id: null })
      .eq('visitor_id', eskiVisitorId)
    if (error) console.error('[consent] anonimleştirme hatası:', error.message)
  }

  // Kanıt kaydı — her karar saklanır.
  const { error: logErr } = await supabase.from('consent_logs').insert({
    visitor_id: visitorId ?? eskiVisitorId ?? null,
    categories: kategoriler,
    version: CONSENT_VERSION,
    source: kaynak,
  })
  if (logErr) console.error('[consent] kayıt hatası:', logErr.message)

  const durum = {
    categories: kategoriler,
    version: CONSENT_VERSION,
    at: new Date().toISOString(),
  }

  const res = NextResponse.json({ ok: true, categories: kategoriler, visitorId })
  const ortak = {
    httpOnly: false, // istemci banner'ı da okuyabilmeli
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
  res.cookies.set(CONSENT_COOKIE, serializeConsent(durum), { ...ortak, maxAge: CONSENT_MAX_AGE })

  if (visitorId) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      ...ortak,
      httpOnly: true, // kimliği yalnız sunucu okur
      maxAge: VISITOR_MAX_AGE,
    })
  } else {
    res.cookies.set(VISITOR_COOKIE, '', { ...ortak, httpOnly: true, maxAge: 0 })
  }

  return res
}

/** Mevcut tercihleri okur (banner ilk açılışta buna bakmaz; çerez yeterli). */
export async function GET(request: Request) {
  const cerez = request.headers.get('cookie') || ''
  const deger = cerez
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1)

  const durum = parseConsent(deger)
  return NextResponse.json({
    consent: durum,
    guncelSurum: CONSENT_VERSION,
    // Sürüm değiştiyse banner yeniden sorulmalı.
    yenidenSor: !durum || durum.version !== CONSENT_VERSION,
  })
}
