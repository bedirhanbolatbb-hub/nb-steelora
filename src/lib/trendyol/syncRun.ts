import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { syncTrendyolPage } from './sync'

/**
 * Sayfalı sync zinciri.
 *
 * Tek istek en fazla CHUNK_PAGES sayfa işler ve kalan varsa kendi ucunu yeniden
 * tetikler; böylece hiçbir istek Vercel'in 60 sn sınırına yaklaşmaz. Koşunun
 * tamamı sync_log'daki tek satırda izlenir: başlangıçta status='running',
 * bitişte 'success'/'partial' + finished_at.
 */
export const CHUNK_PAGES = 2
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

/** Zincirin kendini tetiklerken kullanacağı mutlak adres. */
export function selfUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base.replace(/\/$/, '')}${path}`
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
 * Zincirin bir sonraki halkasını tetikler. Yanıtı beklemez (fire-and-forget);
 * yalnız isteğin kabul edildiğini kısa bir zaman aşımıyla doğrular.
 */
export async function triggerNextChunk(runId: string, runStartedAt: string, page: number) {
  const url = selfUrl('/api/sync')
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ run_id: runId, run_started_at: runStartedAt, page }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Zincir kopabilir; satır 'running' kalır ve STALE_RUN_MIN sonrası
    // 'failed' olarak kapanır, bir sonraki cron temiz başlar.
  }
}
