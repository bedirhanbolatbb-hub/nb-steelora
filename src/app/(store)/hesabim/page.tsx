import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HesabimClient from '@/components/store/HesabimClient'

export default async function HesabimPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/giris')

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <HesabimClient
      user={{ id: user.id, email: user.email, user_metadata: user.user_metadata }}
      profile={profile}
      orders={orders || []}
    />
  )
}
