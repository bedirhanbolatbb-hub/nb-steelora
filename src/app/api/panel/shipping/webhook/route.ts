import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { getCarrierProvider } from '@/lib/shipping/providers'
import { SITE_URL } from '@/lib/seo'

/**
 * Webhook adresini sağlayıcıya kaydeder (panel «Webhook'u kaydet» düğmesi).
 * Token yokken 503 döner; panel düğmeyi zaten pasif gösterir.
 */
export async function POST() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const saglayici = getCarrierProvider()
  const hedef = `${SITE_URL}/api/webhooks/carrier/${saglayici.slug}`

  if (!saglayici.hazir) {
    return NextResponse.json(
      { error: `${saglayici.ad} için token tanımlı değil`, url: hedef },
      { status: 503 }
    )
  }

  if (saglayici.slug !== 'kargonomi') {
    // Mock sağlayıcıda kaydedilecek uzak uç yok; adres bilgi olarak döner.
    return NextResponse.json({ ok: true, url: hedef, note: 'Mock sağlayıcıda kayıt gerekmez' })
  }

  try {
    const res = await fetch('https://app.kargonomi.com.tr/api/v1/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KARGONOMI_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url: hedef, event_type: 'shipment.updated' }),
    })
    const metin = await res.text()
    if (!res.ok) {
      return NextResponse.json({ error: `Kayıt başarısız: ${metin.slice(0, 200)}` }, { status: 502 })
    }
    return NextResponse.json({ ok: true, url: hedef })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Kayıt başarısız' }, { status: 502 })
  }
}
