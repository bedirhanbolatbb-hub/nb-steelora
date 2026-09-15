import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { createServiceClient } from '@/lib/supabase/service'
import { iadeTalebiAc } from '@/lib/iade/talepAc'
import { ORDER_REQUEST_REASON_MAX_LEN } from '@/lib/account/orderRequestsApi'

export const dynamic = 'force-dynamic'

/**
 * ÜYE OLMAYAN müşterinin iade talebi (Faz 30).
 *
 * GERÇEK OLAY (7 Eyl 2026): ilk gerçek müşteri (üyeliksiz sipariş) tüm
 * ürünleri iade etmek istedi. Ona "Siparişlerim ekranından iade talebi açın"
 * denildi — oysa o ekran YALNIZ üyede var. Üyeliksiz müşterinin sitede iade
 * talebi açmasının hiçbir yolu yoktu; panelde de iade düğmesi müşterinin
 * açtığı talebe bağlı olduğu için mağaza tarafında da açılamıyordu. Yani
 * teslim edilmiş üyeliksiz bir siparişte iade akışı BAŞLATILAMIYORDU.
 *
 * Doğrulama üyelik değil, kargo takip sayfasındaki ile aynı: sipariş numarası
 * + siparişteki e-posta İKİSİ BİRDEN eşleşmeli. Sipariş numarası tek başına
 * yetmez, e-posta tek başına yetmez.
 *
 * Bu uç YALNIZ kimlik doğrular; kayıt, mail ve iade defteri adımı ortak
 * yardımcıda (Faz 33) — panelden açılan talep de aynı yoldan geçer.
 */
export async function POST(request: Request) {
  const sinir = await hizSiniri(`iade-talebi:${istekKimligi(request)}`, 5, 3600)
  if (!sinir.gecer) return cokFazlaIstek(sinir.bekleSaniye)

  const body = await request.json().catch(() => null)
  const siparisNo = String(body?.order_number ?? '').trim()
  const eposta = String(body?.email ?? '').trim().toLowerCase()
  const gerekce = String(body?.reason ?? '').trim().slice(0, ORDER_REQUEST_REASON_MAX_LEN)

  if (!siparisNo || !eposta) {
    return NextResponse.json({ error: 'Sipariş numarası ve e-posta gerekli.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: siparis } = await service
    .from('orders')
    .select('id, order_number, status, guest_email, total, updated_at')
    .eq('order_number', siparisNo)
    .maybeSingle()

  // Var/yok ayrımı sızmasın diye tek ve nötr mesaj (kargo takip ucuyla aynı).
  if (!siparis || (siparis.guest_email || '').toLowerCase() !== eposta) {
    return NextResponse.json(
      { error: 'Kayıt bulunamadı. Bilgileri kontrol edip tekrar deneyin.' },
      { status: 404 }
    )
  }

  // Müşterinin kendi açtığı talepte cayma süresi UYGULANIR.
  const sonuc = await iadeTalebiAc({
    siparis,
    gerekce,
    kaynak: 'musteri',
    sureyiUygula: true,
  })
  if (!sonuc.ok) {
    return NextResponse.json(
      { error: sonuc.hata, ...(sonuc.kod ? { code: sonuc.kod } : {}) },
      { status: sonuc.durum }
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
