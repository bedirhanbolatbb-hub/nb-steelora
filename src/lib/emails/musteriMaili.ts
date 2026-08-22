import { sendMail } from './send'
import { bildirimAdresi } from './bildirim'

/**
 * Müşteriye giden maillerin tek kapısı (Faz 15 sonrası güvenlik ağı).
 *
 * Neden var: iptal/iade bildirimi eklendikten sonra, TEST siparişiyle yapılan
 * uçtan uca koşu gerçek bir müşteri maili gibi görünen bir ileti üretti
 * (alıcı test siparişinin kendi e-postasıydı, ama o adres mağaza kutusuna
 * düşüyordu). Alıcı ve sipariş numarası artık gönderimden ÖNCE denetleniyor:
 *
 *   - alıcı boşsa               → gönderilmez
 *   - alıcı yönetici adresiyse  → gönderilmez (müşteri maili yöneticiye düşmez)
 *   - sipariş numarası test ise → gönderilmez (NBS-TEST…, TEST-…)
 *
 * Her engelleme tek satır hata olarak loglanır ve çağırana `engellendi`
 * sebebiyle döner; panel sipariş detayı aynı kuralla kırmızı uyarı gösterir.
 */

export type MailEngeli = {
  gonderildi: false
  sebep: 'alici-yok' | 'yonetici-adresi' | 'test-siparisi' | 'hata'
  detay?: string
}

export type MusteriMailSonucu = { gonderildi: true; id: string | null } | MailEngeli

/** Sipariş numarası test verisi mi? (gerçek numaralar NBS-<zaman damgası> biçiminde) */
export function testSiparisNumarasi(orderNumber: string | null | undefined): boolean {
  const n = (orderNumber ?? '').trim().toUpperCase()
  return n.startsWith('NBS-TEST') || n.startsWith('TEST-') || n.includes('-TEST-')
}

/** Panelin de kullandığı denetim: bu siparişe müşteri maili gönderilebilir mi? */
export function musteriMailiEngeli(
  eposta: string | null | undefined,
  orderNumber: string | null | undefined,
  yoneticiAdresi: string
): MailEngeli | null {
  const alici = (eposta ?? '').trim().toLowerCase()
  if (!alici || !alici.includes('@')) return { gonderildi: false, sebep: 'alici-yok' }
  if (alici === yoneticiAdresi.trim().toLowerCase()) return { gonderildi: false, sebep: 'yonetici-adresi' }
  if (testSiparisNumarasi(orderNumber)) return { gonderildi: false, sebep: 'test-siparisi' }
  return null
}

export async function musteriMailiGonder(params: {
  eposta: string | null | undefined
  orderNumber: string | null | undefined
  subject: string
  html: string
  label: string
}): Promise<MusteriMailSonucu> {
  const yonetici = await bildirimAdresi()
  const engel = musteriMailiEngeli(params.eposta, params.orderNumber, yonetici)
  if (engel) {
    console.error(
      `[musteri-maili] ENGELLENDİ (${engel.sebep}) · sipariş=${params.orderNumber ?? '—'} · ` +
        `alıcı=${params.eposta ?? '—'} · şablon=${params.label}`
    )
    return engel
  }

  const sonuc = await sendMail({
    to: String(params.eposta).trim(),
    subject: params.subject,
    html: params.html,
    label: params.label,
  })
  if (sonuc.error) {
    console.error(`[musteri-maili] gönderilemedi · sipariş=${params.orderNumber} · ${sonuc.error}`)
    return { gonderildi: false, sebep: 'hata', detay: sonuc.error }
  }
  console.log(
    `[musteri-maili] gönderildi · sipariş=${params.orderNumber} · alıcı=${params.eposta} · id=${sonuc.id}`
  )
  return { gonderildi: true, id: sonuc.id }
}
