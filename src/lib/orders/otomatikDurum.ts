import { createServiceClient } from '@/lib/supabase/service'
import { validateOrderStatusTransition } from '@/lib/orders/statusTransitions'
import { reviewInviteEmail, shippingNotificationEmail } from '@/lib/emails/templates'
import { musteriMailiGonder } from '@/lib/emails/musteriMaili'
import { bildirimDamgala, bildirimDamgasi } from '@/lib/emails/bildirimSuprugu'
import { ikinciSiparisKuponuVer } from '@/lib/kuponlar/ikinciSiparis'
import type { KargoDurumu } from '@/lib/shipping/providers/types'

/**
 * Sipariş durumunun kargodan OTOMATİK ilerlemesi (Faz 30).
 *
 * BB elle durum işaretlemek istemiyor. Kargo tarafındaki gerçek olay
 * (Kargonomi'den webhook ya da yoklama) siparişi kendiliğinden ilerletsin;
 * müşteri maili de aynı anda gitsin.
 *
 * TEK KAYNAK: hem webhook hem yoklama hem panel yenileme buradan geçer.
 * Aynı işi üç yerde ayrı yazmak, üçünün zamanla ayrışması demekti — geçen
 * turda kargo alanlarının bir yerde okunup diğerinde okunmaması tam olarak
 * bu yüzden gözden kaçmıştı.
 *
 * Kargonomi durum değerleri dokümandan doğrulandı:
 *   webservice_order_created      → kargo siparişi oluşturuldu
 *   webservice_shipment_started   → kargo teslim sürecinde (taşımada)
 *   webservice_shipment_delivered → teslim edildi
 */

/** Kargo durumunun karşılık geldiği sipariş durumu. Yoksa ilerletme yok. */
export function siparisDurumuIcin(kargo: KargoDurumu): 'shipped' | 'delivered' | null {
  // 'kargoya_verildi' de 'yolda' da müşteri için aynı şey: paket yola çıktı.
  if (kargo === 'kargoya_verildi' || kargo === 'yolda') return 'shipped'
  if (kargo === 'teslim_edildi') return 'delivered'
  return null
}

export type IlerletmeSonucu = {
  denendi: boolean
  siparisDurumu?: string
  yeniDurum?: string | null
  durumDegisti: boolean
  mailGonderildi: string[]
  atlandi?: string
}

/**
 * Siparişi kargo durumuna göre ilerletir ve gereken müşteri maillerini yollar.
 *
 * SADECE İLERİ GİDER: geçiş matrisi (statusTransitions) neye izin veriyorsa o
 * yapılır. Geri dönüş, iptal edilmiş siparişi diriltme ya da atlama olmaz.
 * Mail gönderimleri damgalanır; damgalı olan tekrar gönderilmez.
 */
export async function siparisiKargodanIlerlet(
  orderId: string,
  kargoDurumu: KargoDurumu,
  takipKodu: string | null
): Promise<IlerletmeSonucu> {
  const hedef = siparisDurumuIcin(kargoDurumu)
  if (!hedef) return { denendi: false, durumDegisti: false, mailGonderildi: [] }

  const supabase = createServiceClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, guest_email, user_id, total, items, tracking_number, review_invite_sent_at, metadata')
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return { denendi: true, durumDegisti: false, mailGonderildi: [], atlandi: 'sipariş yok' }

  const sonuc: IlerletmeSonucu = {
    denendi: true,
    siparisDurumu: order.status ?? undefined,
    durumDegisti: false,
    mailGonderildi: [],
  }

  // İptal/iade edilmiş siparişi kargo olayı diriltmesin.
  if (['cancelled', 'refunded'].includes(String(order.status))) {
    sonuc.atlandi = `sipariş ${order.status}`
    return sonuc
  }

  // ── Durum ilerlemesi ────────────────────────────────────────────────
  if (order.status !== hedef) {
    const hata = validateOrderStatusTransition(order.status, hedef)
    if (hata) {
      // 'preparing → delivered' gibi bir atlama gelirse önce ara adımı
      // uygularız; kargo bazen "başladı" olayını hiç göndermeden "teslim"
      // diyebiliyor.
      if (hedef === 'delivered' && !validateOrderStatusTransition(order.status, 'shipped')) {
        await supabase
          .from('orders')
          .update({ status: 'shipped', updated_at: new Date().toISOString() })
          .eq('id', orderId)
        order.status = 'shipped'
      } else {
        sonuc.atlandi = hata
      }
    }
    if (!sonuc.atlandi && !validateOrderStatusTransition(order.status, hedef)) {
      await supabase
        .from('orders')
        .update({ status: hedef, updated_at: new Date().toISOString() })
        .eq('id', orderId)
      sonuc.yeniDurum = hedef
      sonuc.durumDegisti = true
      order.status = hedef
    }
  }

  // ── Kargo bildirimi ─────────────────────────────────────────────────
  const kod = takipKodu || order.tracking_number
  if ((order.status === 'shipped' || order.status === 'delivered') && kod) {
    if (!(await bildirimDamgasi(orderId, 'kargo'))) {
      const { subject, html } = shippingNotificationEmail(order as any, String(kod))
      const gonderim = await musteriMailiGonder({
        eposta: order.guest_email,
        orderNumber: order.order_number,
        subject,
        html,
        label: 'Shipping notification',
      })
      if (gonderim.gonderildi) {
        await bildirimDamgala(orderId, 'kargo', (gonderim as any).id ?? null)
        sonuc.mailGonderildi.push('kargo')
      }
    }
  }

  // ── Teslimat zinciri ────────────────────────────────────────────────
  if (order.status === 'delivered') {
    if (!(await bildirimDamgasi(orderId, 'teslimat'))) {
      // Değerlendirme daveti teslimat bildirimini de üstleniyor: müşteriye
      // "teslim edildi" demenin yanına doğal olarak yorum çağrısı geliyor.
      const items = Array.isArray(order.items) ? (order.items as any[]) : []
      const productIds = items.map((i) => i?.productId ?? i?.product_id).filter(Boolean)
      let urunler: any[] = []
      if (productIds.length > 0) {
        const { data } = await supabase
          .from('products_display')
          .select('slug, display_title, display_images')
          .in('id', productIds)
        urunler = data || []
      }
      const { subject, html } = reviewInviteEmail(
        order as any,
        urunler.map((p) => ({
          slug: p.slug,
          display_title: p.display_title,
          image: (p.display_images as string[] | null)?.[0] ?? null,
        }))
      )
      const gonderim = await musteriMailiGonder({
        eposta: order.guest_email,
        orderNumber: order.order_number,
        subject,
        html,
        label: 'Review invite',
      })
      if (gonderim.gonderildi) {
        await bildirimDamgala(orderId, 'teslimat', (gonderim as any).id ?? null)
        // Eski alan da korunuyor: panel ve cron onu okuyor.
        await supabase
          .from('orders')
          .update({ review_invite_sent_at: new Date().toISOString() })
          .eq('id', orderId)
        sonuc.mailGonderildi.push('teslimat')
      }
    }

    // İkinci sipariş kuponu — kendi içinde tekrarsız.
    try {
      await ikinciSiparisKuponuVer(supabase, {
        id: order.id,
        order_number: order.order_number,
        guest_email: order.guest_email,
        user_id: (order as any).user_id ?? null,
        total: (order as any).total ?? null,
      })
    } catch (e: any) {
      console.error('[otomatikDurum] ikinci sipariş kuponu verilemedi:', e?.message)
    }
  }

  return sonuc
}
