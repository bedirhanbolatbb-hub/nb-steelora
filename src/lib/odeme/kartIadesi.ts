import { refundFullPayment } from '@/lib/iyzico/client'
import { ToslaHatasi, toslaKimligi, toslaOdemesiMi } from '@/lib/tosla/client'
import { kartOdemesiniGeriVer } from '@/lib/tosla/kartOdemesi'

/**
 * Siparişin KART tahsilatını tamamen geri verir — ödeme kuruluşu fark
 * etmeksizin tek kapı (12 Kas 2026).
 *
 *  - `tosla:<sipariş no>` → Tosla İşim: aynı gün ve tam tutarsa iptal
 *    (karttan hiç çekilmemiş gibi), değilse iade. Karar Tosla'nın kaydına
 *    göre verilir; daha önce yapılmışsa yeniden gönderilmez (bkz.
 *    lib/tosla/kartOdemesi `kartOdemesiniGeriVer`).
 *  - diğer dolu kimlik → 7 Kas 2026 öncesi iyzico siparişi (eski firma).
 *
 * Tutar siparişin GÜNCEL toplamıdır: kalem iptaliyle bir kısmı daha önce
 * iade edildiyse kalan iade edilir.
 */
export async function kartTahsilatiniGeriVer(order: {
  order_number: string
  total: number | string
  iyzico_payment_id: string | null
  metadata?: any
}): Promise<{
  success: boolean
  error?: string
  saglayici: 'tosla' | 'iyzico'
  yol?: 'iptal' | 'iade'
  /** Tosla kaydına göre iş daha önce yapılmıştı; yeni istek gitmedi. */
  zaten?: boolean
}> {
  if (toslaOdemesiMi(order.iyzico_payment_id)) {
    const kimlik = toslaKimligi()
    if (!kimlik) {
      return { success: false, saglayici: 'tosla', error: 'Kart ödeme bilgileri (Tosla) tanımlı değil — iade yapılamadı' }
    }
    try {
      const g = await kartOdemesiniGeriVer(kimlik, order)
      return { success: true, saglayici: 'tosla', yol: g.yol, ...(g.zaten ? { zaten: true } : {}) }
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : String(e)
      const gecici = e instanceof ToslaHatasi ? e.gecici : true
      return {
        success: false,
        saglayici: 'tosla',
        error: gecici ? `Tosla'ya ulaşılamadı, birkaç dakika sonra tekrar deneyin (${mesaj})` : mesaj,
      }
    }
  }
  const r = await refundFullPayment(String(order.iyzico_payment_id))
  return { ...r, saglayici: 'iyzico' }
}
