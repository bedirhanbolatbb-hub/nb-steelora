import { NextResponse } from 'next/server'
import {
  closeStaleRuns,
  failRun,
  getServiceClient,
  PAGE_SIZE,
  processRun,
  startRun,
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
  if (!isCronRequest(request) && !isAdminRequest(request)) {
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
  if (isCronRequest(request)) {
    try {
      return await runSync()
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
