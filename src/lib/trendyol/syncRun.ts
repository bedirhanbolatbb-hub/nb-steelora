import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { syncTrendyolPage } from './sync'

/**
 * Sayfalı sync zinciri.
 *
 * Her halka yanıtı HEMEN döner, işi Next'in after() kancasında yapar ve bittiğinde
 * bir sonraki halkayı tetikler. Böylece ne çağıran beklemede kalır ne de tek bir
 * istek Vercel'in 60 sn sınırına yaklaşır (bir sayfa ≈ 18 sn). Koşunun
 * tamamı sync_log'daki tek satırda izlenir: başlangıçta status='running',
 * bitişte 'success'/'partial' + finished_at.
 */
export const CHUNK_PAGES = 1
export const PAGE_SIZE = 50

/** Bu süreden taze bir 'running' koşu varken yeni koşu başlatılmaz. */
export const CONCURRENT_WINDOW_MIN = 10

/** Bu süreyi aşan 'running' satırlar ölü sayılır ve 'failed' olarak kapatılır. */
export const STALE_RUN_MIN = 20

export function getServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Zincirin kendini tetiklerken kullanacağı mutlak adres.
 *
 * Öncelik isteğin KENDİ origin'idir: yapılandırmadaki adres (ör. apex alan)
 * www'ye 307 ile yönlenirse fetch, çapraz-origin yönlendirmede Authorization
 * başlığını düşürüyor ve zincir 401 alıp sessizce ölüyor — canlıda tam olarak
 * bu oldu. SYNC_SELF_URL yerel/staging için elle geçersiz kılma imkânı verir.
 */
export function selfUrl(path: string, requestOrigin?: string): string {
  const base =
    process.env.SYNC_SELF_URL ||
    requestOrigin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  return `${base.replace(/\/$/, '')}${path}`
}

/** İsteğin geldiği mutlak origin (proxy başlıklarına saygılı). */
export function originFromRequest(request: Request): string | undefined {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!host) return undefined
  const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Yarıda ölmüş koşuları kapatır — admin göstergesi ve yarış koruması için. */
export async function closeStaleRuns(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUN_MIN * 60_000).toISOString()
  const { data } = await supabase
    .from('sync_log')
    .update({
      status: 'failed',
      error_message: `Koşu ${STALE_RUN_MIN} dk içinde tamamlanmadı (zincir koptu).`,
      finished_at: new Date().toISOString(),
    })
    .eq('status', 'running')
    .lt('synced_at', cutoff)
    .select('id')

  return data?.length ?? 0
}

export type StartResult =
  | { started: true; runId: string; runStartedAt: string }
  | { started: false; reason: 'skipped_concurrent'; runId: string }

/** Yeni koşu açar; taze bir koşu sürüyorsa açmaz. */
export async function startRun(supabase: SupabaseClient): Promise<StartResult> {
  await closeStaleRuns(supabase)

  const freshCutoff = new Date(Date.now() - CONCURRENT_WINDOW_MIN * 60_000).toISOString()
  const { data: running } = await supabase
    .from('sync_log')
    .select('run_id')
    .eq('status', 'running')
    .gt('synced_at', freshCutoff)
    .limit(1)
    .maybeSingle()

  if (running?.run_id) {
    return { started: false, reason: 'skipped_concurrent', runId: running.run_id }
  }

  const runId = `sync_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const runStartedAt = new Date().toISOString()

  await supabase.from('sync_log').insert({
    run_id: runId,
    status: 'running',
    synced_at: runStartedAt,
    pages_done: 0,
    products_added: 0,
    products_updated: 0,
  })

  return { started: true, runId, runStartedAt }
}

export type ChunkResult = {
  runId: string
  pagesProcessed: number
  nextPage: number | null
  done: boolean
  added: number
  updated: number
  skipped: number
  deactivated: number
  totalPages: number
  totalElements: number
}

/**
 * Zincirin bir halkası: en fazla CHUNK_PAGES sayfa işler, ilerlemeyi sync_log'a
 * yazar. Son sayfa bittiyse koşuyu kapatır.
 */
export async function processChunk(params: {
  supabase: SupabaseClient
  runId: string
  runStartedAt: string
  startPage: number
}): Promise<ChunkResult> {
  const { supabase, runId, runStartedAt, startPage } = params

  let page = startPage
  let pagesProcessed = 0
  let added = 0
  let updated = 0
  let skipped = 0
  let deactivated = 0
  let done = false
  let totalPages = 0
  let totalElements = 0

  while (pagesProcessed < CHUNK_PAGES) {
    const result = await syncTrendyolPage(page, PAGE_SIZE, runStartedAt)
    added += result.added
    updated += result.updated
    skipped += result.skipped
    deactivated += result.deactivated
    totalPages = result.totalPages
    totalElements = result.totalElements
    pagesProcessed++
    done = result.done
    if (done) break
    page++
  }

  // Toplamları koşu satırına ekle (zincir boyunca birikir).
  const { data: current } = await supabase
    .from('sync_log')
    .select('products_added, products_updated, pages_done')
    .eq('run_id', runId)
    .maybeSingle()

  const totals = {
    products_added: (current?.products_added ?? 0) + added,
    products_updated: (current?.products_updated ?? 0) + updated,
    pages_done: (current?.pages_done ?? 0) + pagesProcessed,
  }

  if (done) {
    await supabase
      .from('sync_log')
      .update({
        ...totals,
        status: skipped > 0 ? 'partial' : 'success',
        error_message: skipped > 0 ? `${skipped} varyant stok/fiyat alınamadığı için atlandı` : null,
        finished_at: new Date().toISOString(),
      })
      .eq('run_id', runId)
  } else {
    await supabase.from('sync_log').update(totals).eq('run_id', runId)
  }

  return {
    runId,
    pagesProcessed,
    // page, döngü sonunda ZATEN bir sonraki işlenecek sayfayı gösterir;
    // buna bir daha eklemek araya sayfa atlatır (atlanan sayfadaki ürünler
    // koşuda görülmediği için sonunda pasife çekilirdi).
    nextPage: done ? null : page,
    done,
    added,
    updated,
    skipped,
    deactivated,
    totalPages,
    totalElements,
  }
}

/**
 * Zincirin bir sonraki halkasını tetikler.
 *
 * Karşı taraf yanıtı hemen döndürüp işi kendi after() kancasında yaptığı için
 * bu istek kısa sürer. İstek iptal EDİLMEZ: AbortSignal kullanmak çağrılan
 * isteği de iptal ediyor ve zincir ilk halkada kopuyordu.
 */
export async function triggerNextChunk(
  runId: string,
  runStartedAt: string,
  page: number,
  requestOrigin?: string,
  supabase?: SupabaseClient
) {
  const url = selfUrl('/api/sync', requestOrigin)
  let lastProblem = ''

  // İki deneme: geçici bir ağ hatası zinciri kopartmasın.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        // Yönlendirme izlenmez: sessizce yetkisiz kalmak yerine hata versin.
        redirect: 'error',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ run_id: runId, run_started_at: runStartedAt, page }),
      })

      if (res.ok) return
      lastProblem = `HTTP ${res.status} — ${(await res.text()).slice(0, 120)}`
    } catch (error: any) {
      lastProblem = error?.message ?? 'bilinmeyen hata'
    }
    console.error(`[sync] zincir tetiklenemedi (deneme ${attempt}): ${lastProblem}`)
  }

  // Sunucu loglarına erişimi olmayan biri için hatayı koşu satırına yaz:
  // zincirin nerede ve neden koptuğu admin panelinden görülebilsin.
  if (supabase) {
    await supabase
      .from('sync_log')
      .update({
        error_message: `Zincir sayfa ${page} tetiklenirken koptu (${url}): ${lastProblem}`,
      })
      .eq('run_id', runId)
  }
}
