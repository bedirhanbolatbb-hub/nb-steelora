import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  fetchOrderOwnedByUser,
  hasPendingOrderRequest,
  parseOptionalReason,
} from '@/lib/account/orderRequestsApi'

export async function POST(
  request: Request,
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

  let body: unknown = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 })
  }

  const parsed = parseOptionalReason(body)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'Açıklama geçersiz veya çok uzun.' },
      { status: 400 }
    )
  }

  const service = createServiceClient()
  const owned = await fetchOrderOwnedByUser(service, orderId, user.id)
  if (!owned.ok) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
  }

  if (owned.order.status !== 'delivered') {
    return NextResponse.json(
      { error: 'İade talebi yalnızca teslim edilmiş siparişler için oluşturulabilir.' },
      { status: 400 }
    )
  }

  if (await hasPendingOrderRequest(service, orderId)) {
    return NextResponse.json(
      { error: 'Bu sipariş için zaten bekleyen bir talep var.' },
      { status: 409 }
    )
  }

  const { data: row, error } = await service
    .from('order_requests')
    .insert({
      order_id: orderId,
      user_id: user.id,
      request_type: 'return',
      status: 'pending',
      reason: parsed.reason,
    })
    .select('id, order_id, user_id, request_type, status, reason, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Bu sipariş için zaten bekleyen bir talep var.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Talep kaydedilemedi.' }, { status: 500 })
  }

  return NextResponse.json({ request: row }, { status: 201 })
}
