import { NextResponse, after } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { odemeBildirimleriniGonder, odemeSonrasiIsle } from '@/lib/odeme/odemeSonrasi'

export const maxDuration = 60

/**
 * Panel · "Ödeme geldi, onayla" (havale/EFT, 7 Kas 2026).
 *
 * BB parayı hesabında görünce basar. Geçiş tek seferliktir: yalnız
 * status='pending' iken 'paid' yapılır (iki kez basılsa ikinci istek 409).
 * Ardından kart ödemesiyle AYNI zincir çalışır: ölçüm, kupon sayacı, stok
 * düşümü, kişisel kupon, Trendyol stok kuyruğu ve müşteriye onay maili.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const serviceClient = createServiceClient()

  const { data: order } = await serviceClient.from('orders').select('*').eq('id', id).maybeSingle()
  if (!order) return NextResponse.json({ success: false, error: 'Sipariş bulunamadı' }, { status: 404 })
  const metadata = (order.metadata ?? {}) as Record<string, any>
  if (metadata.odeme_yontemi !== 'havale') {
    return NextResponse.json({ success: false, error: 'Bu sipariş havale/EFT siparişi değil.' }, { status: 400 })
  }
  if (order.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: `Sipariş zaten "${order.status}" durumunda; ödeme onayı yalnız bekleyen siparişte yapılır.` },
      { status: 409 }
    )
  }

  const simdi = new Date().toISOString()
  const { data: rows, error } = await serviceClient
    .from('orders')
    .update({
      status: 'paid',
      updated_at: simdi,
      metadata: { ...metadata, havale: { ...(metadata.havale ?? {}), odeme_onaylandi: simdi } },
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()

  const guncel = rows?.[0] ?? null
  if (error || !guncel) {
    return NextResponse.json(
      { success: false, error: error?.message ?? 'Sipariş az önce başka bir işlemle değişti; sayfayı yenileyin.' },
      { status: 409 }
    )
  }

  await odemeSonrasiIsle(serviceClient, guncel, Number(guncel.total) || 0, '[havale-onay]')
  after(async () => {
    await odemeBildirimleriniGonder(guncel, { yonetici: false })
  })

  return NextResponse.json({ success: true })
}
