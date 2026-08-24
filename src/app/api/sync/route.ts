import { NextResponse } from 'next/server'
import { gonderileriYokla } from '@/lib/shipping/yoklama'
import { adminIstegiMi, cronIstegiMi } from '@/lib/admin/requireAdmin'
import { revalidatePath } from 'next/cache'
import {
  closeStaleRuns,
  failRun,
  getServiceClient,
  PAGE_SIZE,
  processRun,
  startRun,
} from '@/lib/trendyol/syncRun'

export const maxDuration = 60


/**
 * Koşunun tamamı bu istekte yapılır: bütün sayfalar, sonra pasife çekme.
 * Zincir (kendini tetikleyen halkalar) kaldırıldı — Vercel self-fetch'i
 * HTTP 508 ile engelliyor; toplu upsert sayesinde zaten gerekmiyor.
 */
async function runSync() {
  const supabase = getServiceClient()

  const start = await startRun(supabase)
  if (!start.started) {
    return NextResponse.json({
      skipped: true,
      reason: start.reason,
      run_id: start.runId,
      message: 'Taze bir sync koşusu sürüyor; bu tetikleme atlandı.',
    })
  }

  try {
    const result = await processRun({
      supabase,
      runId: start.runId,
      runStartedAt: start.runStartedAt,
    })

    // Katalog değişti: beslemeyi ve site haritasını tazelenmek üzere işaretle.
    // İkisi de ISR ile üretiliyor (/feed.xml saatlik, /sitemap.xml günlük);
    // işaretlemezsek senkron bittikten sonra bir saate kadar ESKİ malzeme,
    // fiyat ve ürün kümesini yayınlamaya devam ediyorlar. 23 Ağustos'ta malzeme
    // düzeltmesi canlıya indiğinde besleme tam olarak bu yüzden bir saat
    // boyunca eski hâlini servis etti.
    try {
      revalidatePath('/feed.xml')
      revalidatePath('/sitemap.xml')
    } catch (e: any) {
      // Tazeleme işareti konamazsa koşu yine başarılıdır; besleme kendi
      // süresi dolunca tazelenir.
      console.warn('[sync] besleme/harita tazeleme işareti konamadı:', e?.message)
    }

    // Faz 30: günlük senkron ikinci yoklama turu. Webhook düşerse sipariş
    // durumu en geç burada ilerler.
    try {
      const yoklama = await gonderileriYokla(25)
      if (yoklama.ilerleyenSiparis > 0) console.warn('[sync] yoklama:', yoklama.ayrinti.join(' | '))
    } catch (e: any) {
      console.error('[sync] yoklama hatası (senkron etkilenmedi):', e?.message)
    }

    return NextResponse.json({
      run_id: result.runId,
      run_started_at: start.runStartedAt,
      status: result.status,
      done: result.done,
      pages_done: result.pagesDone,
      products_added: result.added,
      products_updated: result.updated,
      skipped: result.skipped,
      deactivated: result.deactivated,
      totalPages: result.totalPages,
      totalElements: result.totalElements,
      duration_ms: result.durationMs,
      note: result.note,
      pageSize: PAGE_SIZE,
    })
  } catch (error: any) {
    // Satır 'running' kalırsa 20 dk boyunca yeni koşu başlamaz; hemen kapat.
    await failRun(supabase, start.runId, error?.message ?? 'bilinmeyen hata')
    throw error
  }
}

export async function POST(request: Request) {
  if (!cronIstegiMi(request) && !(await adminIstegiMi(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return await runSync()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Vercel cron bu yoldan gelir: koşunun tamamı burada işlenir.
  if (cronIstegiMi(request)) {
    try {
      return await runSync()
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Faz 27: durum okuma da PANELE bağlandı. Bu dal korumasızdı ve kimlik
  // doğrulaması olmadan 200 dönüyordu: son 10 senkron koşusu, hata mesajları,
  // aktif ürün sayısı ve çalışan sürüm bilgisi dışarıya açıktı. Müşteri
  // verisi yoktu ama bir saldırgan için sistem haritası çıkarmaya yarardı
  // (hangi sürüm, hangi sağlayıcı, ne sıklıkla çalışıyor, hangi hatayı veriyor).
  if (!(await adminIstegiMi(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Normal GET — son sync durumu
  const supabase = getServiceClient()
  await closeStaleRuns(supabase)

  const { data: logs } = await supabase
    .from('sync_log')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(10)

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  // syncMode: hangi sürümün canlıda olduğunu koşu başlatmadan görebilmek için.
  return NextResponse.json({
    lastSyncs: logs,
    activeProducts: count,
    syncMode: 'single-request-bulk-upsert',
    pageSize: PAGE_SIZE,
  })
}
