import { NextResponse } from 'next/server'
import { syncTrendyolProducts } from '@/lib/trendyol/sync'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
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
  // Vercel cron tetiklemesi
  const authHeader = request.headers.get('authorization')
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
