import type { SupabaseClient } from '@supabase/supabase-js'
import { refundPaymentLine, retrievePaymentDetail } from '@/lib/iyzico/client'
import { increaseStock } from '@/lib/trendyol/stockUpdate'
import { kuyrugaEkle, kuyrugaIsle } from '@/lib/trendyol/stokKuyrugu'
import { kalemIptalEmail } from '@/lib/emails/templates'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'

/**
 * Sipariş içinden TEK ÜRÜN iptali — kısmi iade (Faz 30).
 *
 * BB stok/tedarik sorununda tüm siparişi iptal etmek zorunda kalmasın:
 * tedarik edilemeyen kalemi çıkarıp bedelini iade edebilsin, kalan ürünler
 * yola çıksın.
 *
 * KISMİ İADE DESTEKLENİYOR (canlı ödemeyle doğrulandı): iyzico
 * `/payment/refund` ucu SEPET KALEMİ bazında çalışıyor. `payment/detail`
 * her kalem için ayrı bir `paymentTransactionId` ve `paidPrice` (indirim
 * düşülmüş, gerçekten tahsil edilen tutar) döndürüyor; `itemId` alanı da
 * bizim ürün kimliğimiz. Yani doğru kalemi bulup yalnız onun tutarını iade
 * etmek mümkün.
 *
 * SIRALAMA bilinçli — para önce, kayıt sonra:
 *  1. iyzico'dan iade (başarısızsa hiçbir şey değişmez)
 *  2. stok geri ekleme (bizde + Trendyol kuyruğu)
 *  3. sipariş kalemleri ve toplamı güncellenir
 *  4. müşteriye açıklayıcı mail
 * Ters sırada bir hata, "kalem düştü ama para iade edilmedi" bırakırdı.
 */

export type KismiIptalSonucu =
  | { ok: true; iadeEdilen: number; yeniToplam: number; kalanKalem: number; mailGonderildi: boolean }
  | { ok: false; status: number; hata: string }

/** Kargo oluşturulmuş siparişte kalem iptali yapılamaz. */
async function kargoVarMi(supabase: SupabaseClient, orderId: string): Promise<boolean> {
  const { data } = await supabase
    .from('shipments')
    .select('id')
    .eq('order_id', orderId)
    .is('cancelled_at', null)
    .maybeSingle()
  return Boolean(data)
}

export async function kalemIptalEt(
  supabase: SupabaseClient,
  orderId: string,
  productId: string,
  sebep?: string | null
): Promise<KismiIptalSonucu> {
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return { ok: false, status: 404, hata: 'Sipariş bulunamadı' }

  // ── Kapılar ─────────────────────────────────────────────────────────
  if (!['paid', 'preparing'].includes(String(order.status))) {
    return {
      ok: false,
      status: 400,
      hata: `Bu siparişte kalem iptali yapılamaz (durum: ${order.status}). Yalnız "Ödendi" ve "Hazırlanıyor" aşamalarında mümkün.`,
    }
  }
  if (await kargoVarMi(supabase, orderId)) {
    return {
      ok: false,
      status: 409,
      hata: 'Kargo gönderisi oluşturulmuş — kalem iptal edilemez. Önce gönderiyi iptal edin, sonra tekrar deneyin.',
    }
  }

  const kalemler = Array.isArray(order.items) ? [...(order.items as any[])] : []
  const indeks = kalemler.findIndex((k) => (k?.productId ?? k?.product_id) === productId)
  if (indeks < 0) return { ok: false, status: 404, hata: 'Kalem siparişte bulunamadı' }
  if (kalemler.length <= 1) {
    return {
      ok: false,
      status: 400,
      hata: 'Tek kalem kaldı — bu durumda siparişin tamamını iptal edin.',
    }
  }

  const kalem = kalemler[indeks]
  const adet = Number(kalem?.quantity) || 1

  // ── 1) Para iadesi ──────────────────────────────────────────────────
  if (!order.iyzico_payment_id) {
    return { ok: false, status: 400, hata: 'Ödeme kaydı yok — iade yapılamaz' }
  }

  const detay = await retrievePaymentDetail(String(order.iyzico_payment_id))
  if (detay.status !== 'success') {
    return { ok: false, status: 502, hata: detay.errorMessage || 'Ödeme sorgulanamadı' }
  }
  const satir = (detay.itemTransactions ?? []).find((t: any) => String(t.itemId) === productId)
  if (!satir?.paymentTransactionId) {
    return { ok: false, status: 502, hata: 'Bu kalemin ödeme satırı bulunamadı' }
  }

  const iadeTutari = Number(satir.paidPrice)
  if (!Number.isFinite(iadeTutari) || iadeTutari <= 0) {
    return { ok: false, status: 502, hata: 'İade tutarı okunamadı' }
  }

  const iade = await refundPaymentLine({
    paymentTransactionId: String(satir.paymentTransactionId),
    price: String(iadeTutari),
    currency: detay.currency || 'TRY',
  })
  if (iade.status !== 'success') {
    return { ok: false, status: 502, hata: iade.errorMessage || 'iyzico iadesi başarısız' }
  }

  // ── 2) Stok geri ────────────────────────────────────────────────────
  try {
    await increaseStock(productId, adet)
  } catch (e: any) {
    // Para iade edildi; stok geri eklenemezse siparişi yine güncelleriz ama
    // panelde iz kalır. Sessizce yutmak, envanteri sessizce bozmak olurdu.
    console.error('[kısmi-iptal] yerel stok geri eklenemedi:', productId, e?.message)
  }
  try {
    await kuyrugaEkle({ orderId, items: [{ productId, quantity: adet }], yon: 'iade' })
    await kuyrugaIsle()
  } catch (e: any) {
    console.error('[kısmi-iptal] Trendyol kuyruğu:', e?.message)
  }

  // ── 3) Sipariş kaydı ────────────────────────────────────────────────
  const kalan = kalemler.filter((_, i) => i !== indeks)
  const yeniToplam = Math.round((Number(order.total || 0) - iadeTutari) * 100) / 100
  const mevcutMeta = (order.metadata as Record<string, unknown>) ?? {}
  const iptaller = Array.isArray((mevcutMeta as any).iptal_kalemler)
    ? [...(mevcutMeta as any).iptal_kalemler]
    : []
  iptaller.push({
    productId,
    ad: kalem?.name ?? null,
    adet,
    iadeTutari,
    sebep: sebep ?? null,
    zaman: new Date().toISOString(),
    paymentTransactionId: String(satir.paymentTransactionId),
  })

  await supabase
    .from('orders')
    .update({
      items: kalan,
      total: Math.max(0, yeniToplam),
      metadata: { ...mevcutMeta, iptal_kalemler: iptaller },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  // ── 4) Müşteri bilgilendirmesi ──────────────────────────────────────
  let mailGonderildi = false
  try {
    const { subject, html } = kalemIptalEmail(
      { ...(order as any), total: Math.max(0, yeniToplam) },
      { ad: kalem?.name ?? 'Ürün', adet, iadeTutari, sebep: sebep ?? null }
    )
    const gonderim = await musteriMailiGonder({
      eposta: order.guest_email,
      orderNumber: order.order_number,
      subject,
      html,
      label: 'Kalem iptali',
    })
    mailGonderildi = gonderim.gonderildi
  } catch (e: any) {
    console.error('[kısmi-iptal] müşteri maili gönderilemedi:', e?.message)
  }

  return {
    ok: true,
    iadeEdilen: iadeTutari,
    yeniToplam: Math.max(0, yeniToplam),
    kalanKalem: kalan.length,
    mailGonderildi,
  }
}
