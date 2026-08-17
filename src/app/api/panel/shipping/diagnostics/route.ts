import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { getCarrierProvider } from '@/lib/shipping/providers'
import { adAnahtari } from '@/lib/shipping/geo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASE = 'https://app.kargonomi.com.tr/api/v1'

/**
 * Kargonomi canlı bağlantı tanılaması (Faz 10B).
 *
 * Token yalnız üretim ortamında tanımlı olduğu için bu kontroller canlıdan,
 * admin guard'ı arkasından çalıştırılır. Hiçbir gönderi ONAYLANMAZ; yalnız
 * okuma uçları ve depo/bölge karşılaştırması yapılır.
 */
async function kargonomiGet(yol: string): Promise<{ ok: boolean; status: number; govde: any }> {
  const token = process.env.KARGONOMI_TOKEN || ''
  if (!token) return { ok: false, status: 0, govde: { hata: 'KARGONOMI_TOKEN tanımsız' } }
  try {
    const res = await fetch(`${BASE}${yol}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    const metin = await res.text()
    let govde: any = metin
    try {
      govde = JSON.parse(metin)
    } catch {
      govde = metin.slice(0, 300)
    }
    return { ok: res.ok, status: res.status, govde }
  } catch (e: any) {
    return { ok: false, status: 0, govde: { hata: e?.message } }
  }
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const saglayici = getCarrierProvider()
  const sonuc: Record<string, unknown> = {
    aktifSaglayici: { slug: saglayici.slug, ad: saglayici.ad, hazir: saglayici.hazir },
    env: {
      CARRIER_PROVIDER: process.env.CARRIER_PROVIDER || '(tanımsız)',
      KARGONOMI_TOKEN: process.env.KARGONOMI_TOKEN ? 'tanımlı' : 'YOK',
      KARGONOMI_WEBHOOK_SECRET: process.env.KARGONOMI_WEBHOOK_SECRET ? 'tanımlı' : 'YOK',
      KARGONOMI_WAREHOUSE_ID: process.env.KARGONOMI_WAREHOUSE_ID || '(tanımsız)',
    },
  }

  // 0) İstenirse tek bir gönderinin ham verileri (ayrıştırma hatası aramak için)
  const gonderiId = sp.get('shipment')
  if (gonderiId) {
    sonuc.shipmentHam = await kargonomiGet(`/shipments/${gonderiId}`)
    sonuc.fiyatHam = await kargonomiGet(`/shipment-price-comparison/${gonderiId}`)
    return NextResponse.json(sonuc)
  }

  // 0b) Taslak temizleme denemeleri (yalnız açık istekle; kredi harcamaz)
  const silId = sp.get('sil')
  if (silId) {
    const token = process.env.KARGONOMI_TOKEN || ''
    const dene = async (yol: string, method: string, govde?: any) => {
      const res = await fetch(`${BASE}${yol}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(govde ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(govde ? { body: JSON.stringify(govde) } : {}),
      })
      const t = await res.text()
      return { yol, method, status: res.status, yanit: t.slice(0, 200) }
    }
    sonuc.silDenemeleri = [
      await dene(`/shipments/${silId}`, 'DELETE'),
      await dene('/shipments/cancel', 'POST', { shipment_id: Number(silId) }),
      await dene('/shipments/cancel', 'POST', { shipment_ids: [Number(silId)] }),
    ]
    return NextResponse.json(sonuc)
  }

  // 1) Bakiye / yetki
  sonuc.credit = await kargonomiGet('/user/credit')

  // 2) Depo listesi — sağlayıcının hangi yolu kullandığı dokümanda net değil,
  //    olası uçları sırayla deneyip yanıt vereni raporlarız.
  const depoYollari = ['/warehouses', '/user/warehouses', '/warehouse', '/addresses']
  const depoDenemeleri: any[] = []
  for (const yol of depoYollari) {
    const r = await kargonomiGet(yol)
    depoDenemeleri.push({ yol, status: r.status, ok: r.ok, ornek: r.ok ? r.govde : undefined })
    if (r.ok) break
  }
  sonuc.depolar = depoDenemeleri

  // 3) İl/ilçe: gerçek liste vs carrier_regions önbelleği
  if (sp.get('bolge') !== 'atla') {
    const states = await kargonomiGet('/states/1')
    const supabase = createServiceClient()
    const { data: onbellekIller } = await supabase
      .from('carrier_regions')
      .select('provider, provider_id, name, name_key')
      .eq('kind', 'state')

    const gercekIller: any[] = states.ok ? (states.govde?.data ?? states.govde ?? []) : []
    const ornekAdlar = ['Mersin', 'İstanbul', 'Ankara', 'İzmir', 'Bursa']
    const karsilastirma = ornekAdlar.map((ad) => {
      const gercek = gercekIller.find((s: any) => adAnahtari(String(s.name)) === adAnahtari(ad))
      const onbellek = (onbellekIller || []).find(
        (s: any) => s.name_key === adAnahtari(ad) && s.provider === saglayici.slug
      )
      return {
        il: ad,
        kargonomiId: gercek?.id ?? null,
        onbellekId: onbellek?.provider_id ?? null,
        onbellekSaglayici: onbellek ? (onbellek as any).provider : null,
        uyusuyor: gercek?.id != null && onbellek?.provider_id === gercek.id,
      }
    })

    // Mersin ilçeleri (Mezitli doğrulaması)
    const mersin = gercekIller.find((s: any) => adAnahtari(String(s.name)) === adAnahtari('Mersin'))
    let mezitli: any = null
    let mersinIlceSayisi = 0
    if (mersin?.id) {
      const cities = await kargonomiGet(`/cities/${mersin.id}`)
      const liste: any[] = cities.ok ? (cities.govde?.data ?? cities.govde ?? []) : []
      mersinIlceSayisi = liste.length
      mezitli = liste.find((c: any) => adAnahtari(String(c.name)) === adAnahtari('Mezitli')) ?? null
    }

    sonuc.bolgeler = {
      statesStatus: states.status,
      kargonomiIlSayisi: gercekIller.length,
      onbellekIlSayisi: (onbellekIller || []).length,
      onbellekSaglayicilari: [...new Set((onbellekIller || []).map((r: any) => r.provider))],
      ornekler: karsilastirma,
      mersinIlceSayisi,
      mezitli,
    }
  }

  return NextResponse.json(sonuc)
}
