/**
 * Trendyol'a fatura BAĞLANTISI gönderme ve geri alma (14 Kas 2026).
 *
 * Belge: developers.trendyol.com "Send Customer Invoice Link" ve "Delete
 * Customer Invoice Link".
 *   POST /integration/sellers/{id}/seller-invoice-links
 *        { invoiceLink, shipmentPackageId, invoiceDateTime (ms), invoiceNumber (3+13) }
 *        201 başarı; 409 "pakete daha önce fatura verilmiş" ya da "bağlantı
 *        başka pakete verilmiş".
 *   POST /integration/sellers/{id}/seller-invoice-links/delete
 *        { serviceSourceId: paket, channelId: 1, customerId } → 202
 * Bağlantı müşteriye Trendyol'un e-postasıyla gider ve 8 yıl açık kalmalıdır.
 *
 * Bu modül yalnız yukleme.ts'ten, bütün denetimler geçtikten sonra çağrılır.
 */
import { getHeaders, istek } from '@/lib/trendyol/client'

const KOK = 'https://apigw.trendyol.com/integration/sellers'

function satici(): string {
  const s = process.env.TRENDYOL_SUPPLIER_ID?.trim()
  if (!s) throw new Error('TRENDYOL_SUPPLIER_ID tanımlı değil')
  return s
}

export type GonderimSonucu =
  | { durum: 'tamam' }
  | { durum: 'zaten'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | { durum: 'belirsiz'; mesaj: string }

const kisalt = (s: string) => s.replace(/\s+/g, ' ').slice(0, 200)

export async function faturaBaglantisiGonder(g: {
  link: string
  paketId: number
  faturaZamani: number
  belgeNumarasi: string
}): Promise<GonderimSonucu> {
  let yanit: Response
  try {
    yanit = await istek(
      `${KOK}/${satici()}/seller-invoice-links`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          invoiceLink: g.link,
          shipmentPackageId: g.paketId,
          invoiceDateTime: g.faturaZamani,
          invoiceNumber: g.belgeNumarasi,
        }),
        cache: 'no-store',
      },
      20_000
    )
  } catch (e) {
    // Zaman aşımı: Trendyol işlemiş de olabilir. Görüntü silinmez, sonraki tur bakar.
    return { durum: 'belirsiz', mesaj: `Trendyol yanıt vermedi (${(e as Error).name})` }
  }
  const metin = kisalt(await yanit.text().catch(() => ''))
  if (yanit.status >= 200 && yanit.status < 300) return { durum: 'tamam' }
  if (yanit.status === 409) return { durum: 'zaten', mesaj: metin }
  if (yanit.status >= 500) return { durum: 'belirsiz', mesaj: `HTTP ${yanit.status}` }
  return { durum: 'hata', mesaj: `HTTP ${yanit.status} ${metin}`.trim() }
}

export async function faturaBaglantisiSil(paketId: number, musteriId: number): Promise<{ tamam: boolean; mesaj: string }> {
  try {
    const yanit = await istek(
      `${KOK}/${satici()}/seller-invoice-links/delete`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ serviceSourceId: paketId, channelId: 1, customerId: musteriId }),
        cache: 'no-store',
      },
      20_000
    )
    const metin = kisalt(await yanit.text().catch(() => ''))
    return { tamam: yanit.status >= 200 && yanit.status < 300, mesaj: `HTTP ${yanit.status} ${metin}`.trim() }
  } catch (e) {
    return { tamam: false, mesaj: `Trendyol yanıt vermedi (${(e as Error).name})` }
  }
}
