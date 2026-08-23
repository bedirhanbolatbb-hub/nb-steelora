import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMail } from '@/lib/emails/send'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { saglikRaporuEmail } from '@/lib/emails/templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Günlük sağlık raporu (Faz 19) — her sabah BB'ye tek mail.
 *
 * Kritik uyarılar ARIZA anında gider; bu rapor "sessizliğin iyi haber olduğunu"
 * doğrular: mail gelmiyorsa cron da çalışmıyor demektir, bu da bir sinyaldir.
 *
 * Veri kaynağı `analytics_daily` — rollup cron'u (00:30) çoktan üretmiş olur.
 * Ağır `raporUret()` yolu kullanılmıyor: o, dönemi ve önceki dönemi 1000'lik
 * sayfalarla 50 bin satıra kadar çekiyor; günlük mail için gereksiz.
 */

function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

function isAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || ''
  const adminToken = cookieHeader.match(/admin_token=([^;]+)/)?.[1]
  const secret = process.env.ADMIN_SECRET_TOKEN
  return Boolean(secret) && adminToken === secret
}

/** İstanbul takvimine göre dünün tarihi (YYYY-MM-DD). */
function dunIstanbul(simdi = new Date()): string {
  const bugun = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(simdi)
  const d = new Date(`${bugun}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function raporVerisi() {
  const supabase = createServiceClient()
  const gun = dunIstanbul()

  const [gunluk, sync, bekleyen, basarisiz, siparisler] = await Promise.all([
    supabase.from('analytics_daily').select('*').eq('day', gun).maybeSingle(),
    supabase
      .from('sync_log')
      .select('status, synced_at, error_message')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('stock_sync_queue').select('id', { count: 'exact', head: true }).eq('status', 'bekliyor'),
    supabase.from('stock_sync_queue').select('id', { count: 'exact', head: true }).eq('status', 'basarisiz'),
    supabase
      .from('orders')
      .select('id, total, status', { count: 'exact' })
      .gte('created_at', `${gun}T00:00:00+03:00`)
      .lt('created_at', `${gun}T23:59:59.999+03:00`),
  ])

  const g = gunluk.data
  const syncYasiSaat = sync.data?.synced_at
    ? Math.round(((Date.now() - new Date(sync.data.synced_at).getTime()) / 3_600_000) * 10) / 10
    : null

  // Siparişler analytics'ten DEĞİL orders tablosundan sayılır: ikisi ayrı
  // kaynak ve ayrışmaları başlı başına bir sinyaldir.
  const gecerliSiparisler = (siparisler.data ?? []).filter((o: any) => o.status !== 'cancelled')

  const uyarilar: string[] = []
  if (syncYasiSaat == null) uyarilar.push('Senkron koşu kaydı yok.')
  else if (syncYasiSaat > 26) uyarilar.push(`Senkron ${syncYasiSaat} saattir koşmadı (beklenen: günde bir).`)
  if (sync.data?.status === 'failed') uyarilar.push(`Son senkron BAŞARISIZ: ${sync.data.error_message ?? '-'}`)
  if (sync.data?.status === 'partial') uyarilar.push(`Son senkron kısmi tamamlandı: ${sync.data.error_message ?? '-'}`)
  if ((basarisiz.count ?? 0) > 0) uyarilar.push(`Stok kuyruğunda ${basarisiz.count} başarısız kayıt var.`)
  if ((bekleyen.count ?? 0) > 20) uyarilar.push(`Stok kuyruğunda ${bekleyen.count} bekleyen kayıt birikti.`)
  if (!g) uyarilar.push(`${gun} için analitik özeti üretilmemiş (rollup cron'u koşmamış olabilir).`)
  if (g && (g.begin_checkout ?? 0) > 0 && gecerliSiparisler.length === 0) {
    uyarilar.push(`${g.begin_checkout} kez ödemeye başlandı ama hiç sipariş tamamlanmadı.`)
  }

  return {
    gun,
    ziyaretci: g?.visitors ?? 0,
    oturum: g?.sessions ?? 0,
    sayfaGoruntuleme: g?.page_views ?? 0,
    sepeteEkleme: g?.add_to_cart ?? 0,
    odemeBaslatma: g?.begin_checkout ?? 0,
    siparis: gecerliSiparisler.length,
    ciro: gecerliSiparisler.reduce((t: number, o: any) => t + (Number(o.total) || 0), 0),
    syncDurum: sync.data?.status ?? 'kayıt yok',
    syncYasiSaat,
    stokKuyrugu: { bekleyen: bekleyen.count ?? 0, basarisiz: basarisiz.count ?? 0 },
    uyarilar,
  }
}

async function calistir(gonder: boolean) {
  const veri = await raporVerisi()
  if (!gonder) return { ...veri, mail: 'gönderilmedi (önizleme)' }

  const alici = await bildirimAdresi()
  const mail = saglikRaporuEmail(veri)
  const sonuc = await sendMail({ to: alici, subject: mail.subject, html: mail.html, label: 'Günlük sağlık raporu' })
  return { ...veri, mail: sonuc.error ? `hata: ${sonuc.error}` : `gönderildi (${sonuc.id})` }
}

export async function GET(request: Request) {
  if (isCronRequest(request)) {
    try {
      return NextResponse.json(await calistir(true))
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Panelden önizleme: veriyi gösterir, mail ATMAZ.
  if (isAdminRequest(request)) {
    try {
      return NextResponse.json(await calistir(new URL(request.url).searchParams.get('gonder') === '1'))
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
