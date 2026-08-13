import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { syncTrendyolPage } from './sync'

/**
 * Sync koşusu — TEK istekte tamamlanır.
 *
 * Eskiden koşu, her halkası kendini bir sonraki sayfa için yeniden tetikleyen
 * bir zincirdi. Vercel bunu 5. halkada HTTP 508 (INFINITE_LOOP_DETECTED) ile
 * kesiyordu; kendini çağıran fonksiyon platformda kalıcı olarak engelli.
 * Yazma artık sayfa başına tek toplu upsert olduğu için (bkz. sync.ts) tüm
 * sayfalar tek çağrının 60 sn'lik penceresine sığıyor ve zincire gerek kalmadı.
 *
 * Koşunun tamamı sync_log'daki tek satırda izlenir: başlangıçta status='running',
 * bitişte 'success' / 'partial' / 'failed' + finished_at.
 */
export const PAGE_SIZE = 50

/** Tek koşuda işlenecek sayfa tavanı — sonsuz döngüye karşı sert sınır. */
export const MAX_PAGES = 40

/**
 * Bu süreden sonra pasife çekme ADIMI ATLANIR.
 *
 * Koşu beklenenden uzun sürdüyse sayfaların hepsi gerçekten görüldü mü emin
 * olamayız; görülmeyeni pasife çekmek katalogu düşürür. Böyle bir koşu
 * 'partial' kapanır, katalog olduğu gibi kalır, bir sonraki koşu düzeltir.
 */
export const DEACTIVATE_BUDGET_MS = 45_000

/**
 * Sayfa döngüsünün bütçesi. Vercel'in 60 sn sınırına çarpıp koşuyu yanıtsız
 * bırakmaktansa, kalan sayfaları bırakıp koşuyu 'partial' kapatmak yeğdir.
 */
export const PAGE_BUDGET_MS = 50_000

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

/** Yarıda ölmüş koşuları kapatır — admin göstergesi ve yarış koruması için. */
export async function closeStaleRuns(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUN_MIN * 60_000).toISOString()
  const { data } = await supabase
    .from('sync_log')
    .update({
      status: 'failed',
      error_message: `Koşu ${STALE_RUN_MIN} dk içinde tamamlanmadı.`,
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

export type RunResult = {
  runId: string
  status: 'success' | 'partial'
  pagesDone: number
  done: boolean
  added: number
  updated: number
  skipped: number
  deactivated: number
  totalPages: number
  totalElements: number
  durationMs: number
  note: string | null
}

/**
 * Koşunun tamamı: tüm sayfalar, ardından pasife çekme ve kapanış.
 * Pasife çekilenler yalnızca BU koşuda hiç görülmemiş aktif satırlardır.
 */
export async function processRun(params: {
  supabase: SupabaseClient
  runId: string
  runStartedAt: string
}): Promise<RunResult> {
  const { supabase, runId, runStartedAt } = params
  const startedMs = Date.now()

  let page = 0
  let pagesDone = 0
  let added = 0
  let updated = 0
  let skipped = 0
  let done = false
  let totalPages = 0
  let totalElements = 0
  let note: string | null = null

  while (page < MAX_PAGES) {
    const result = await syncTrendyolPage(page, PAGE_SIZE, runStartedAt)
    added += result.added
    updated += result.updated
    skipped += result.skipped
    totalPages = result.totalPages
    totalElements = result.totalElements
    pagesDone++
    done = result.done
    if (done) break

    page++

    if (Date.now() - startedMs > PAGE_BUDGET_MS) {
      note = `Süre bütçesi aşıldı: ${pagesDone}/${totalPages} sayfa işlendi, kalanı sonraki koşuya bırakıldı.`
      break
    }
  }

  const elapsedBeforeDeactivate = Date.now() - startedMs

  // Güvenlik ağı: koşu tamamlanmadıysa VEYA 45 sn'yi aştıysa pasife çekme
  // adımı atlanır. Katalogun düşmesindense eski satırın bir tur daha kalması.
  let deactivated = 0
  const canDeactivate = done && elapsedBeforeDeactivate <= DEACTIVATE_BUDGET_MS

  if (canDeactivate) {
    const { data: stale } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('last_synced_at', runStartedAt)
      .select('id')
    deactivated = stale?.length ?? 0
    if (deactivated > 0) console.log(`Sync: ${deactivated} ürün pasife çekildi (bu koşuda görülmedi)`)
  } else if (done) {
    note = `Koşu ${Math.round(elapsedBeforeDeactivate / 1000)} sn sürdü (sınır ${DEACTIVATE_BUDGET_MS / 1000} sn); pasife çekme atlandı.`
  }

  if (skipped > 0) {
    const skippedNote = `${skipped} varyant stok/fiyat alınamadığı için atlandı`
    note = note ? `${note} ${skippedNote}` : skippedNote
  }

  const status: 'success' | 'partial' = done && canDeactivate && skipped === 0 ? 'success' : 'partial'
  const durationMs = Date.now() - startedMs

  await supabase
    .from('sync_log')
    .update({
      products_added: added,
      products_updated: updated,
      pages_done: pagesDone,
      status,
      error_message: note,
      finished_at: new Date().toISOString(),
    })
    .eq('run_id', runId)

  console.log(
    `[sync] ${runId}: ${pagesDone} sayfa, +${added}/${updated} güncellendi, ${skipped} atlandı, ${deactivated} pasife çekildi, ${durationMs} ms, ${status}`
  )

  return {
    runId,
    status,
    pagesDone,
    done,
    added,
    updated,
    skipped,
    deactivated,
    totalPages,
    totalElements,
    durationMs,
    note,
  }
}

/** Koşu ölürse satır 'running' kalmasın: hata mesajıyla kapat. */
export async function failRun(supabase: SupabaseClient, runId: string, message: string) {
  await supabase
    .from('sync_log')
    .update({
      status: 'failed',
      error_message: message.slice(0, 400),
      finished_at: new Date().toISOString(),
    })
    .eq('run_id', runId)
}
