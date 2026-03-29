import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { data: orders },
    { data: products },
    { data: campaigns },
    { data: syncLogs },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('products_display').select('*').order('created_at', { ascending: false }),
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    supabase.from('sync_log').select('*').order('synced_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <AdminDashboard
      orders={orders || []}
      products={products || []}
      campaigns={campaigns || []}
      syncLogs={syncLogs || []}
      reviews={reviews || []}
    />
  )
}
