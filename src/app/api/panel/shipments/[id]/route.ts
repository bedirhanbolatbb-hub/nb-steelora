import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { getProviderBySlug } from '@/lib/shipping/providers'
import {
  gonderiGuncelle,
  olayEkle,
  olaylariGetir,
  siparisTakipNoSenkronla,
  type ShipmentRow,
} from '@/lib/shipping/shipments'

async function gonderiyiAl(id: string): Promise<ShipmentRow | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('shipments').select('*').eq('id', id).maybeSingle()
  return (data as ShipmentRow) ?? null
}

/** Gönderi detayı + olay çizelgesi (panel yenilemeleri için). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const gonderi = await gonderiyiAl(id)
  if (!gonderi) return NextResponse.json({ error: 'Gönderi bulunamadı' }, { status: 404 })
  return NextResponse.json({ shipment: gonderi, events: await olaylariGetir(id) })
}

/**
 * Gönderi eylemleri:
 *   action=rates    → fiyat tekliflerini getir
 *   action=select   → firma seç (carrier_id yoksa sağlayıcı en ucuzu seçer)
 *   action=label    → etiket PDF'i (base64)
 *   action=cancel   → gönderiyi iptal et
 *   action=refresh  → sağlayıcıdaki güncel durumu çek
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const action = String(body?.action || '')

  const gonderi = await gonderiyiAl(id)
  if (!gonderi) return NextResponse.json({ error: 'Gönderi bulunamadı' }, { status: 404 })

  const saglayici = getProviderBySlug(gonderi.provider)
  if (!saglayici) return NextResponse.json({ error: 'Sağlayıcı tanınmadı' }, { status: 400 })
  if (!saglayici.hazir) {
    return NextResponse.json({ error: `${saglayici.ad} için token tanımlı değil` }, { status: 503 })
  }

  try {
    switch (action) {
      case 'rates': {
        const teklifler = await saglayici.getRates(gonderi.provider_shipment_id)
        return NextResponse.json({ ok: true, rates: teklifler })
      }

      case 'select': {
        const firmaId = body?.carrier_id ? String(body.carrier_id) : null
        const sonuc = await saglayici.selectCarrier(gonderi.provider_shipment_id, firmaId)
        await gonderiGuncelle(id, {
          carrier_name: sonuc.firmaAdi,
          carrier_slug: sonuc.firmaSlug,
          tracking_code: sonuc.takipKodu,
          price_real: sonuc.fiyat,
          status: sonuc.durum,
          status_raw: sonuc.durumHam,
        })
        await olayEkle({
          shipmentId: id,
          status: sonuc.durum,
          statusRaw: sonuc.durumHam,
          note: `${sonuc.firmaAdi} seçildi${sonuc.fiyat != null ? ` — ${sonuc.fiyat} TL` : ''}`,
          source: 'manual',
        })
        // Eski akış korunur: orders.tracking_number gönderiyle senkron kalır.
        if (sonuc.takipKodu) await siparisTakipNoSenkronla(gonderi.order_id, sonuc.takipKodu)
        return NextResponse.json({ ok: true, result: sonuc })
      }

      case 'label': {
        const { base64 } = await saglayici.getLabelPdf(gonderi.provider_shipment_id)
        return NextResponse.json({ ok: true, pdf: base64 })
      }

      case 'cancel': {
        const sonuc = await saglayici.cancelShipment(gonderi.provider_shipment_id)
        await gonderiGuncelle(id, {
          status: sonuc.durum,
          status_raw: sonuc.durumHam,
          cancelled_at: new Date().toISOString(),
        })
        await olayEkle({
          shipmentId: id,
          status: sonuc.durum,
          statusRaw: sonuc.durumHam,
          note: 'Gönderi iptal edildi (panel)',
          source: 'manual',
        })
        return NextResponse.json({ ok: true, status: sonuc.durum })
      }

      case 'refresh': {
        const durum = await saglayici.fetchShipment(gonderi.provider_shipment_id)
        const degisti = durum.durum !== gonderi.status
        await gonderiGuncelle(id, {
          status: durum.durum,
          status_raw: durum.durumHam,
          ...(durum.takipKodu ? { tracking_code: durum.takipKodu } : {}),
          ...(durum.firmaAdi ? { carrier_name: durum.firmaAdi, carrier_slug: durum.firmaSlug } : {}),
        })
        if (degisti) {
          await olayEkle({
            shipmentId: id,
            status: durum.durum,
            statusRaw: durum.durumHam,
            note: 'Sağlayıcıdan güncellendi',
            source: 'poll',
          })
        }
        return NextResponse.json({ ok: true, status: durum.durum })
      }

      default:
        return NextResponse.json({ error: 'Bilinmeyen eylem' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'İşlem başarısız' }, { status: 502 })
  }
}
