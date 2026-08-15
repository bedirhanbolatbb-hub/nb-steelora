import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { getCarrierProvider } from '@/lib/shipping/providers'
import { gonderiKaydet, gonderiGetir } from '@/lib/shipping/shipments'
import { bolgeEslestir } from '@/lib/shipping/geo'

/**
 * Gönderi oluşturma (panel).
 * Sipariş durumu ve mail tetikleri BURADA çalışmaz — panel gönderiyi
 * oluşturduktan sonra mevcut /api/admin/orders/[id] ucunu çağırır.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const orderId = typeof body?.order_id === 'string' ? body.order_id : ''
  if (!orderId) return NextResponse.json({ error: 'order_id gerekli' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, shipping_address, items')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })

  const mevcut = await gonderiGetir(orderId)
  if (mevcut && mevcut.status !== 'iptal') {
    return NextResponse.json({ error: 'Bu siparişin zaten bir gönderisi var' }, { status: 409 })
  }

  const adres = (order.shipping_address || {}) as Record<string, string>
  const ad = String(body?.alici_ad ?? adres.full_name ?? '').trim()
  const telefon = String(body?.alici_telefon ?? adres.phone ?? '').trim()
  const acikAdres = String(body?.alici_adres ?? adres.address ?? '').trim()
  if (!ad || !telefon || !acikAdres) {
    return NextResponse.json({ error: 'Alıcı adı, telefonu ve adresi zorunlu' }, { status: 400 })
  }

  // İl/ilçe: panelden gelirse o kullanılır, gelmezse adres metninden eşlenir.
  let stateId = Number(body?.state_id) || 0
  let cityId = Number(body?.city_id) || 0
  if (!stateId || !cityId) {
    const eslesme = await bolgeEslestir(adres.city || '', adres.district || '')
    if (!eslesme.eslesti) {
      return NextResponse.json(
        { error: eslesme.neden || 'İl/ilçe eşlenemedi — manuel seçim gerekiyor', needsRegion: true },
        { status: 422 }
      )
    }
    stateId = eslesme.stateId!
    cityId = eslesme.cityId!
  }

  const desi = Math.max(1, Number(body?.desi) || 1)
  const kalemler = Array.isArray(order.items) ? (order.items as any[]) : []
  const icerik =
    String(body?.icerik ?? '').trim() ||
    (kalemler.length > 0 ? `Takı — ${kalemler.length} parça` : 'Takı')

  const saglayici = getCarrierProvider()
  if (!saglayici.hazir) {
    return NextResponse.json(
      { error: `${saglayici.ad} için token tanımlı değil` },
      { status: 503 }
    )
  }

  try {
    const sonuc = await saglayici.createShipment({
      siparisNo: order.order_number || orderId,
      alici: { ad, telefon, adres: acikAdres, stateId, cityId },
      paketler: [{ icerik, desi, barkod: order.order_number || undefined }],
    })

    const kayit = await gonderiKaydet({
      orderId,
      provider: saglayici.slug,
      providerShipmentId: sonuc.saglayiciGonderiId,
      status: sonuc.durum,
      statusRaw: sonuc.durumHam,
      desi,
      packageCount: 1,
    })

    return NextResponse.json({ ok: true, shipment: kayit })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Gönderi oluşturulamadı' }, { status: 502 })
  }
}
