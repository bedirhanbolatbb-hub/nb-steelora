import { NextResponse, after } from 'next/server'
import {
  CHUNK_PAGES,
  closeStaleRuns,
  getServiceClient,
  originFromRequest,
  processChunk,
  startRun,
  triggerNextChunk,
} from '@/lib/trendyol/syncRun'

export const maxDuration = 60

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

/**
 * Zincirin bir halkası.
 * - run_id yoksa yeni koşu açılır (taze bir koşu sürüyorsa atlanır).
 * - En fazla CHUNK_PAGES sayfa işlenir; kalan varsa bir sonraki halka tetiklenir.
 */
async function runChunk(body: any, options: { selfTrigger: boolean; origin?: string }) {
  const supabase = getServiceClient()

  let runId: string | undefined = body?.run_id
  let runStartedAt: string | undefined = body?.run_started_at
  const startPage = Number(body?.page ?? 0) || 0

  if (!runId || !runStartedAt) {
    const start = await startRun(supabase)
    if (!start.started) {
      return NextResponse.json({
        skipped: true,
        reason: start.reason,
        run_id: start.runId,
        message: 'Taze bir sync koşusu sürüyor; bu tetikleme atlandı.',
      })
    }
    runId = start.runId
    runStartedAt = start.runStartedAt
  }

  // Cron zincirinde iş, yanıt gönderildikten SONRA yapılır: çağıran beklemez,
  // her halka kendi 60 sn'lik penceresinde tek sayfa işler.
  if (options.selfTrigger) {
    const id = runId
    const startedAt = runStartedAt
    after(async () => {
      try {
        const chunk = await processChunk({ supabase, runId: id, runStartedAt: startedAt, startPage })
        if (!chunk.done && chunk.nextPage !== null) {
          await triggerNextChunk(id, startedAt, chunk.nextPage, options.origin)
        }
      } catch (error: any) {
        console.error('[sync] zincir halkası hata verdi:', error?.message)
      }
    })

    return NextResponse.json({
      accepted: true,
      run_id: runId,
      run_started_at: runStartedAt,
      page: startPage,
      chunkPages: CHUNK_PAGES,
    })
  }

  // Admin manuel koşusu: sayfaları istemci sırayla ister, sonucu bekler.
  const chunk = await processChunk({ supabase, runId, runStartedAt, startPage })

  return NextResponse.json({
    run_id: runId,
    run_started_at: runStartedAt,
    page: startPage,
    pagesProcessed: chunk.pagesProcessed,
    nextPage: chunk.nextPage,
    done: chunk.done,
    added: chunk.added,
    updated: chunk.updated,
    skipped: chunk.skipped,
    deactivated: chunk.deactivated,
    totalPages: chunk.totalPages,
    totalElements: chunk.totalElements,
    chunkPages: CHUNK_PAGES,
  })
}

export async function POST(request: Request) {
  const cron = isCronRequest(request)
  if (!cron && !isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    // Cron zinciri kendini tetikler; admin panelden gelen manuel koşuda
    // sayfaları istemci sırayla ister, kendi kendine tetikleme yapılmaz.
    return await runChunk(body, { selfTrigger: cron, origin: originFromRequest(request) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Vercel cron: koşuyu başlatır, ilk parçayı işler, kalanı zincire bırakır.
  if (isCronRequest(request)) {
    try {
      return await runChunk({}, { selfTrigger: true, origin: originFromRequest(request) })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
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

  return NextResponse.json({ lastSyncs: logs, activeProducts: count })
}
