import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { getCarrierProvider } from '@/lib/shipping/providers'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const BASE = 'https://app.kargonomi.com.tr/api/v1'

function hedefUrl(slug: string): string {
  return `${SITE_URL}/api/webhooks/carrier/${slug}`
}

/** Kayıtlı webhook'ları listeler (kayıt sonrası doğrulama için). */
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const saglayici = getCarrierProvider()
  if (saglayici.slug !== 'kargonomi' || !saglayici.hazir) {
    return NextResponse.json({ ok: true, url: hedefUrl(saglayici.slug), kayitlar: [], not: 'Kargonomi etkin değil' })
  }

  const res = await fetch(`${BASE}/webhooks`, {
    headers: { Authorization: `Bearer ${process.env.KARGONOMI_TOKEN}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  const metin = await res.text()
  let govde: any = metin
  try {
    govde = JSON.parse(metin)
  } catch {
    govde = metin.slice(0, 300)
  }
  return NextResponse.json({ ok: res.ok, status: res.status, url: hedefUrl(saglayici.slug), kayitlar: govde })
}

/**
 * Webhook adresini sağlayıcıya kaydeder (panel «Webhook'u kaydet» düğmesi).
 * Kargonomi gövdede `name` alanını zorunlu tutuyor (canlıda doğrulandı — Faz 10B).
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const saglayici = getCarrierProvider()
  const hedef = hedefUrl(saglayici.slug)

  if (!saglayici.hazir) {
    return NextResponse.json({ error: `${saglayici.ad} için token tanımlı değil`, url: hedef }, { status: 503 })
  }
  if (saglayici.slug !== 'kargonomi') {
    return NextResponse.json({ ok: true, url: hedef, note: 'Mock sağlayıcıda kayıt gerekmez' })
  }

  const body = await request.json().catch(() => null)
  const ad = String(body?.name || 'NB Steelora — gönderi durumu')

  try {
    const res = await fetch(`${BASE}/webhooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KARGONOMI_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: ad,
        url: hedef,
        event_type: 'shipment.updated',
        // Bazı sürümler çoğul alan bekliyor; ikisini de göndermek zararsız.
        events: ['shipment.updated'],
        is_active: 1,
      }),
    })
    const metin = await res.text()
    let govde: any = metin
    try {
      govde = JSON.parse(metin)
    } catch {
      govde = metin.slice(0, 300)
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Kayıt başarısız: ${metin.slice(0, 300)}` }, { status: 502 })
    }
    // Yanıt gizli anahtar döndürüyorsa imza doğrulaması için gereklidir —
    // panelde gösterilir, koda yazılmaz.
    return NextResponse.json({ ok: true, url: hedef, yanit: govde })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Kayıt başarısız' }, { status: 502 })
  }
}
