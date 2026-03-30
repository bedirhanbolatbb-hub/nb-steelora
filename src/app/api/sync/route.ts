import { NextResponse, after } from 'next/server'
import { syncTrendyolProducts } from '@/lib/trendyol/sync'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sync'i arka planda başlat, hemen response dön
  after(async () => {
    try {
      await syncTrendyolProducts()
    } catch (error) {
      console.error('Background sync error:', error)
    }
  })

  return NextResponse.json({ message: 'Sync started in background' })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  // Vercel cron veya manuel tetikleme
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    after(async () => {
      try {
        await syncTrendyolProducts()
      } catch (error) {
        console.error('Background sync error:', error)
      }
    })

    return NextResponse.json({ message: 'Sync started in background' })
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
