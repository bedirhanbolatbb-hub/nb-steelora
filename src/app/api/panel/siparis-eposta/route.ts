import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { bildirimAdresi } from '@/lib/emails/bildirim'

export const dynamic = 'force-dynamic'

/**
 * Sipariş e-postasını panelden düzeltme (Faz 34).
 *
 * Müşteri ödeme sırasında adresini yanlış yazarsa hiçbir mail ulaşmaz ve
 * Resend adresi baskı listesine alır. Doğru adres telefonla alındığında
 * düzeltilecek yer yoktu. Yalnız biçim denetimi yapılır; eski adres hiçbir
 * yere YAZILMAZ (kişisel veri saklanmaz), iç nota yalnız "düzeltildi" düşer.
 */
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const orderId = String(body?.orderId ?? '').trim()
  const eposta = String(body?.email ?? '').trim().toLowerCase()
  if (!orderId) return NextResponse.json({ error: 'orderId gerekli' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi yazın.' }, { status: 400 })
  }
  if (eposta === (await bildirimAdresi()).trim().toLowerCase()) {
    return NextResponse.json({ error: 'Mağaza bildirim adresi müşteri adresi olamaz.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle()
  if (!data) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })

  const mevcut = (data.metadata as Record<string, unknown>) ?? {}
  const notlar = Array.isArray(mevcut.panel_notlari) ? mevcut.panel_notlari : []
  const { error } = await supabase
    .from('orders')
    .update({
      guest_email: eposta,
      metadata: {
        ...mevcut,
        panel_notlari: [...notlar, { t: new Date().toISOString(), m: 'Müşteri e-postası panelden düzeltildi.' }],
      },
    })
    .eq('id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
