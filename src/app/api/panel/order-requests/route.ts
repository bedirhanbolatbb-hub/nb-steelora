import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin/requireAdmin'
import { createServiceClient } from '@/lib/supabase/service'
import { iadeTalebiAc } from '@/lib/iade/talepAc'
import { ORDER_REQUEST_REASON_MAX_LEN } from '@/lib/account/orderRequestsApi'

export const dynamic = 'force-dynamic'

/**
 * Mağazanın MÜŞTERİ ADINA iade talebi açması (Faz 33).
 *
 * Neden gerekti: müşteri iade talebini ya üye ekranından ya da kargo takip
 * sayfasından açabiliyor. Telefonla arayan, maille yazan ya da bu ekranları
 * bulamayan müşteride akış yine başlamıyordu — BB'nin elinde talebi başlatan
 * hiçbir düğme yoktu. Panelde iade adımları (kod gönder, ürünü teslim al,
 * parayı iade et) zaten var ama hepsi AÇIK BİR TALEBE bağlı.
 *
 * Kayıt, müşteriye giden teyit maili ve iade defteri adımı müşterinin kendi
 * açtığı taleple birebir aynı (ortak yardımcı). Tek fark: cayma süresi
 * dolmuşsa panelden yine de açılabilir — süresi geçmiş bir iadeyi kabul etmek
 * mağazanın kendi kararıdır. Süre bilgisi yanıtta döner ve panelde gösterilir.
 */
export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const siparisId = String(body?.orderId ?? '').trim()
  const gerekce = String(body?.reason ?? '').trim().slice(0, ORDER_REQUEST_REASON_MAX_LEN)
  if (!siparisId) {
    return NextResponse.json({ error: 'Sipariş kimliği gerekli.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: siparis } = await service
    .from('orders')
    .select('id, order_number, status, guest_email, total, updated_at')
    .eq('id', siparisId)
    .maybeSingle()

  if (!siparis) {
    return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 })
  }

  const sonuc = await iadeTalebiAc({
    siparis,
    gerekce,
    kaynak: 'panel',
    sureyiUygula: false,
  })
  if (!sonuc.ok) {
    return NextResponse.json({ error: sonuc.hata }, { status: sonuc.durum })
  }

  return NextResponse.json(
    {
      ok: true,
      sureDoldu: sonuc.sureDoldu,
      gecenGun: sonuc.gecenGun,
      // Teyit maili ancak siparişte adres varsa gider; BB "gitti mi" diye
      // bilsin diye dönüyoruz.
      mailAdresiVar: Boolean(siparis.guest_email),
    },
    { status: 201 }
  )
}
