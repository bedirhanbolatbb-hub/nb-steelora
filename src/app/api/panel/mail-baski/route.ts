import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { baskiKaydiBul, baskiyiKaldir } from '@/lib/emails/baskiListesi'

export const dynamic = 'force-dynamic'

/**
 * Resend baskı listesi — panelden okuma ve kaldırma (Faz 34).
 *
 * Adres her zaman SİPARİŞTEN okunur; panel serbest bir e-posta göndermez.
 * Böylece yalnız kendi müşterimizin adresi üzerinde işlem yapılır.
 */
async function siparisAdresi(orderId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('orders').select('guest_email').eq('id', orderId).maybeSingle()
  return (data?.guest_email as string | null) ?? null
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orderId = new URL(request.url).searchParams.get('orderId') ?? ''
  if (!orderId) return NextResponse.json({ error: 'orderId gerekli' }, { status: 400 })
  const adres = await siparisAdresi(orderId)
  if (!adres) return NextResponse.json({ durum: 'yok' })
  return NextResponse.json(await baskiKaydiBul(adres))
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const orderId = String(body?.orderId ?? '').trim()
  if (!orderId) return NextResponse.json({ error: 'orderId gerekli' }, { status: 400 })
  const adres = await siparisAdresi(orderId)
  if (!adres) return NextResponse.json({ error: 'Siparişte e-posta yok' }, { status: 400 })
  const sonuc = await baskiyiKaldir(adres)
  if (!sonuc.ok) return NextResponse.json({ error: `Engel kaldırılamadı (${sonuc.detay})` }, { status: 502 })
  return NextResponse.json({ ok: true })
}
