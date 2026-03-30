import { NextResponse } from 'next/server'
import { syncTrendyolPage } from '@/lib/trendyol/sync'

export const maxDuration = 60

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cookieHeader = request.headers.get('cookie') || ''
  const adminToken = cookieHeader.match(/admin_token=([^;]+)/)?.[1]
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    adminToken === process.env.ADMIN_SECRET_TOKEN

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const page = body.page ?? 0
    const result = await syncTrendyolPage(page, 50)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  // Vercel cron — sayfa 0'dan başlayıp tek seferde tamamla
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    try {
      let page = 0
      let lastResult: any
      while (true) {
        lastResult = await syncTrendyolPage(page, 50)
        if (lastResult.done) break
        page++
      }
      return NextResponse.json(lastResult)
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Normal GET — son sync durumunu göster
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('sync_log')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(10)

  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    lastSyncs: logs,
    totalProducts: count,
  })
}
