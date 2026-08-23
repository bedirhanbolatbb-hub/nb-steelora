import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'
import { DURUM_ETIKETLERI, type KargoDurumu } from '@/lib/shipping/providers/types'

export const dynamic = 'force-dynamic'

/**
 * Müşteri kargo sorgulama ucu.
 *
 * shipments/shipment_events tablolarında müşteri okuması yoktur (RLS kapalı);
 * veriye yalnız buradan, doğrulamadan geçerek ulaşılır:
 *   - sipariş no + e-posta (ikisi birden eşleşmeli), ya da
 *   - takip kodunun tamamı (tahmin edilemeyecek uzunlukta).
 * Yanıtta PII yok: ad, adres, telefon, e-posta hiç dönmez.
 */
export async function POST(request: Request) {
  // Faz 27: kalıcı hız sınırı (bkz. lib/guvenlik/hizSiniri.ts).
  const _sinir = await hizSiniri(`kargo-takip:${istekKimligi(request)}`, 20, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

  const body = await request.json().catch(() => null)
  const siparisNo = String(body?.order_number ?? '').trim()
  const eposta = String(body?.email ?? '').trim().toLowerCase()
  const takipKodu = String(body?.tracking_code ?? '').trim()

  const supabase = createServiceClient()
  let orderId: string | null = null
  let siparisDurumu: string | null = null
  let siparisNumarasi: string | null = null

  if (takipKodu.length >= 8) {
    const { data } = await supabase
      .from('shipments')
      .select('order_id')
      .eq('tracking_code', takipKodu)
      .maybeSingle()
    orderId = data?.order_id ?? null
  } else if (siparisNo && eposta) {
    const { data } = await supabase
      .from('orders')
      .select('id, status, order_number, guest_email')
      .eq('order_number', siparisNo)
      .maybeSingle()
    // E-posta eşleşmesi zorunlu — sipariş numarası tek başına yetmez.
    if (data && (data.guest_email || '').toLowerCase() === eposta) {
      orderId = data.id
      siparisDurumu = data.status
      siparisNumarasi = data.order_number
    }
  } else {
    return NextResponse.json(
      { error: 'Sipariş numarası ve e-posta, ya da takip kodu gerekli' },
      { status: 400 }
    )
  }

  if (!orderId) {
    // Var/yok ayrımı sızmasın diye tek ve nötr mesaj.
    return NextResponse.json({ error: 'Kayıt bulunamadı. Bilgileri kontrol edip tekrar deneyin.' }, { status: 404 })
  }

  if (!siparisNumarasi) {
    const { data } = await supabase
      .from('orders')
      .select('status, order_number')
      .eq('id', orderId)
      .maybeSingle()
    siparisDurumu = data?.status ?? null
    siparisNumarasi = data?.order_number ?? null
  }

  const { data: gonderi } = await supabase
    .from('shipments')
    .select('id, status, tracking_code, carrier_name, created_at, updated_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!gonderi) {
    return NextResponse.json({
      ok: true,
      siparisNo: siparisNumarasi,
      siparisDurumu,
      gonderi: null,
      mesaj: 'Siparişiniz hazırlanıyor. Kargoya verildiğinde takip bilgisi burada görünecek.',
    })
  }

  const { data: olaylar } = await supabase
    .from('shipment_events')
    .select('status, note, occurred_at')
    .eq('shipment_id', gonderi.id)
    .order('occurred_at', { ascending: true })

  return NextResponse.json({
    ok: true,
    siparisNo: siparisNumarasi,
    siparisDurumu,
    gonderi: {
      durum: gonderi.status as KargoDurumu,
      durumEtiketi: DURUM_ETIKETLERI[gonderi.status as KargoDurumu] ?? gonderi.status,
      takipKodu: gonderi.tracking_code,
      firmaAdi: gonderi.carrier_name,
      olusturuldu: gonderi.created_at,
      guncellendi: gonderi.updated_at,
    },
    olaylar: (olaylar || []).map((o: any) => ({
      durum: o.status,
      etiket: DURUM_ETIKETLERI[o.status as KargoDurumu] ?? o.status,
      not: o.note,
      zaman: o.occurred_at,
    })),
  })
}
