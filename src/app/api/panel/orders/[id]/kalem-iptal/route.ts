import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { kalemIptalEt } from '@/lib/orders/kismiIptal'
import { metinAlani } from '@/lib/guvenlik/girdi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Sipariş içinden tek ürün iptali (Faz 30).
 *
 * Para iadesi, stok geri ekleme, sipariş güncellemesi ve müşteri maili tek
 * motordan (lib/orders/kismiIptal.ts) geçer.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  const productId = String(body?.productId ?? '').trim()
  const sebep = metinAlani(body?.sebep, 300) || null

  if (!productId) {
    return NextResponse.json({ error: 'productId gerekli' }, { status: 400 })
  }

  const sonuc = await kalemIptalEt(createServiceClient(), id, productId, sebep)
  if (!sonuc.ok) {
    return NextResponse.json({ error: sonuc.hata }, { status: sonuc.status })
  }
  return NextResponse.json(sonuc)
}
