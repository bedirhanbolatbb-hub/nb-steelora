import { NextResponse } from 'next/server'
import { syncTrendyolProducts } from '@/lib/trendyol/sync'

export const maxDuration = 60

export async function POST(request: Request) {
  // Admin cookie veya Bearer token ile auth
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
    const result = await syncTrendyolProducts()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  // Vercel cron tetiklemesi
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    try {
      const result = await syncTrendyolProducts()
      return NextResponse.json(result)
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
