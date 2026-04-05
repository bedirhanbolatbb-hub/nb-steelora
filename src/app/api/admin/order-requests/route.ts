import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isAdminRequest } from '@/lib/admin/requireAdmin'

type OrderEmbed = {
  order_number: string
  status: string
  guest_email: string | null
  user_id: string | null
}

type Row = {
  id: string
  order_id: string
  user_id: string
  request_type: string
  status: string
  reason: string | null
  created_at: string
  updated_at: string
  orders: OrderEmbed | null
}

function normalizeOrderEmbed(orders: OrderEmbed | OrderEmbed[] | null): OrderEmbed | null {
  if (orders == null) return null
  return Array.isArray(orders) ? orders[0] ?? null : orders
}

function sortRequests(rows: Row[]) {
  return [...rows].sort((a, b) => {
    const ap = a.status === 'pending' ? 0 : 1
    const bp = b.status === 'pending' ? 0 : 1
    if (ap !== bp) return ap - bp
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const selectWithOrder = `
      id,
      order_id,
      user_id,
      request_type,
      status,
      reason,
      created_at,
      updated_at,
      orders (
        order_number,
        status,
        guest_email,
        user_id
      )
    `

  const { data, error } = await service.from('order_requests').select(selectWithOrder)

  if (error) {
    console.error('[admin-order-requests] list join failed, falling back without orders embed', error)
    const fb = await service
      .from('order_requests')
      .select(
        'id, order_id, user_id, request_type, status, reason, created_at, updated_at'
      )
    if (fb.error) {
      console.error('[admin-order-requests] list fallback query failed', fb.error)
      return NextResponse.json(
        { success: false, error: 'Liste yüklenemedi.' },
        { status: 500 }
      )
    }
    const bare = (fb.data || []) as Omit<Row, 'orders'>[]
    const rows: Row[] = bare.map((r) => ({ ...r, orders: null }))
    return NextResponse.json({ requests: sortRequests(rows) })
  }

  const raw = (data || []) as Array<Omit<Row, 'orders'> & { orders: OrderEmbed | OrderEmbed[] | null }>
  const rows: Row[] = raw.map((r) => ({
    ...r,
    orders: normalizeOrderEmbed(r.orders),
  }))
  return NextResponse.json({ requests: sortRequests(rows) })
}
