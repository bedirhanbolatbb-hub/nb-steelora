import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { data: orders },
    { data: products },
    { data: campaigns },
    { data: syncLogs },
    { data: reviews },
    { data: homepageRows },
  ] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
    serviceClient.from('products').select('*, display_title:trendyol_title, display_price:trendyol_price, display_images:trendyol_images').order('created_at', { ascending: false }),
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    supabase.from('sync_log').select('*').order('synced_at', { ascending: false }).limit(5),
    serviceClient.from('reviews').select('*').order('created_at', { ascending: false }).limit(50),
    serviceClient.from('homepage_settings').select('section, product_ids'),
  ])

  const homepageSettings: Record<string, string[]> = {}
  if (homepageRows) {
    for (const row of homepageRows) {
      homepageSettings[row.section] = row.product_ids || []
    }
  }

  return (
    <AdminDashboard
      orders={orders || []}
      products={products || []}
      campaigns={campaigns || []}
      syncLogs={syncLogs || []}
      reviews={reviews || []}
      homepageSettings={homepageSettings}
    />
  )
}
