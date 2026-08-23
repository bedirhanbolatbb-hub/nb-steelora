import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Sağlık ucu (Faz 19).
 *
 * Faz 19 ölçümü: site düşerse ya da sync/ödeme patlarsa kimse haber almıyordu.
 * Bu uç dört şeyi bağımsız kontrol eder ve tek JSON döner; ücretsiz bir uptime
 * servisi (UptimeRobot vb.) buraya bakarak kesintiyi dakikalar içinde yakalar.
 *
 * KİMLİK DOĞRULAMA YOK — kasıtlı: uptime servisi anahtar taşıyamaz. Bu yüzden
 * yanıt İŞ VERİSİ SIZDIRMAZ: sipariş sayısı, ciro, müşteri bilgisi yok; yalnız
 * "çalışıyor/çalışmıyor" ve sync yaşı gibi operasyonel sinyaller var.
 *
 * HTTP KODU: yalnız VERİTABANI düşerse 503 döner — site o hâlde zaten hiçbir
 * şey servis edemez ve uptime servisi haklı olarak alarm vermelidir. Kargonomi
 * ya da Resend kesintisi siteyi ayakta tutar; onlar `degraded` olarak 200
 * döner ve günlük rapor / kritik uyarı yoluyla bildirilir.
 */

const SYNC_UYARI_SAAT = 26 // günlük cron 09:00; 26 saat = bir tur kaçırılmış

type Kontrol = { ad: string; ok: boolean; not?: string }

async function dbKontrol(): Promise<{ kontrol: Kontrol; syncYasiSaat: number | null; syncDurum: string | null }> {
  try {
    const supabase = createServiceClient()
    // En ucuz canlılık sorgusu: tek satır, (status, synced_at DESC) indeksli.
    // Hem DB'nin ayakta olduğunu hem sync yaşını aynı çağrıda verir.
    const { data, error } = await supabase
      .from('sync_log')
      .select('status, synced_at, error_message')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Faz 27: ham hata metni istemciye dönüyordu (uç kimliksiz).
    if (error) console.error('[health] veritabanı:', error.message)
    if (error) return { kontrol: { ad: 'veritabani', ok: false, not: 'veritabanina ulasilamadi' }, syncYasiSaat: null, syncDurum: null }

    const yas = data?.synced_at
      ? Math.round(((Date.now() - new Date(data.synced_at).getTime()) / 3_600_000) * 10) / 10
      : null

    return {
      kontrol: { ad: 'veritabani', ok: true },
      syncYasiSaat: yas,
      syncDurum: data?.status ?? null,
    }
  } catch (e: any) {
    return { kontrol: { ad: 'veritabani', ok: false, not: e?.message }, syncYasiSaat: null, syncDurum: null }
  }
}

async function kargonomiKontrol(): Promise<Kontrol> {
  const token = process.env.KARGONOMI_TOKEN || ''
  if (!token) return { ad: 'kargonomi', ok: false, not: 'token tanımsız' }
  try {
    // Yan etkisiz GET; yetkiyi de doğrular. Gönderi uçlarına DOKUNULMAZ
    // (/shipments POST kredi harcar).
    const res = await fetch('https://app.kargonomi.com.tr/api/v1/user/credit', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return { ad: 'kargonomi', ok: res.ok, not: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ad: 'kargonomi', ok: false, not: e?.name === 'TimeoutError' ? 'zaman aşımı' : e?.message }
  }
}

async function resendKontrol(): Promise<Kontrol> {
  const key = process.env.RESEND_API_KEY || ''
  if (!key) return { ad: 'resend', ok: false, not: 'anahtar tanımsız' }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    // 401/403: anahtar "yalnız gönderim" kapsamlı olabilir — bu bir arıza
    // DEĞİLDİR, mail gönderimi çalışmaya devam eder. Ayrı işaretlenir.
    if (res.status === 401 || res.status === 403) {
      return { ad: 'resend', ok: true, not: 'anahtar yalnız gönderim kapsamlı (arıza değil)' }
    }
    return { ad: 'resend', ok: res.ok, not: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e: any) {
    return { ad: 'resend', ok: false, not: e?.name === 'TimeoutError' ? 'zaman aşımı' : e?.message }
  }
}

export async function GET() {
  const baslangic = Date.now()

  const [db, kargonomi, resend] = await Promise.all([dbKontrol(), kargonomiKontrol(), resendKontrol()])

  const syncOk =
    db.syncYasiSaat == null
      ? false
      : db.syncYasiSaat <= SYNC_UYARI_SAAT && db.syncDurum !== 'failed'

  const kontroller: Kontrol[] = [
    db.kontrol,
    {
      ad: 'senkron',
      ok: syncOk,
      not:
        db.syncYasiSaat == null
          ? 'koşu kaydı yok'
          : `${db.syncYasiSaat} sa önce · ${db.syncDurum}`,
    },
    kargonomi,
    resend,
  ]

  const dbDustu = !db.kontrol.ok
  const hepsiOk = kontroller.every((k) => k.ok)
  const durum = dbDustu ? 'down' : hepsiOk ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      status: durum,
      checks: Object.fromEntries(kontroller.map((k) => [k.ad, { ok: k.ok, ...(k.not ? { not: k.not } : {}) }])),
      ts: new Date().toISOString(),
      ms: Date.now() - baslangic,
    },
    {
      status: dbDustu ? 503 : 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
