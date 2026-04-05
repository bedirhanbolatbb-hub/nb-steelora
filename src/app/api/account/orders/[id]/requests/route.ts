import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchOrderOwnedByUser } from '@/lib/account/orderRequestsApi'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 })
  }

  const service = createServiceClient()
  const owned = await fetchOrderOwnedByUser(service, orderId, user.id)
  if (!owned.ok) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
  }

  const { data, error } = await service
    .from('order_requests')
    .select('id, order_id, user_id, request_type, status, reason, created_at, updated_at')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Talepler yüklenemedi.' }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] })
}
