/**
 * Trendyol'a müşteri faturası DOSYASI (PDF) gönderme (14 Kas 2026).
 *
 * Belge: developers.trendyol.com "Send Customer Invoice File".
 *   POST /integration/sellers/{id}/seller-invoice-file   (multipart/form-data)
 *        shipmentPackageId + file (PDF, en çok 10 MB); mikro ihracat
 *        paketlerinde invoiceDateTime ve invoiceNumber de ZORUNLU.
 *   Hatalar (metin): "has already been sent" (pakete fatura verilmiş),
 *   "could not be found", "does not belong to the specified seller".
 * Trendyol dosyayı saklar ve müşteriye kendisi iletir. Gönderilen dosyayı
 * geri alan bir uç YOK; bu yüzden bu modül yalnız yukleme.ts'ten, bütün
 * denetimler geçtikten sonra çağrılır.
 */
import { getHeaders } from '@/lib/trendyol/client'

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

export async function faturaDosyasiGonder(g: {
  pdf: Buffer
  /** BB'nin elle yüklerken kullandığı ad: sipariş numarası (ör. 11808648857.pdf). */
  dosyaAdi: string
  paketId: number
  belgeNumarasi: string
  faturaZamani: number
  mikro: boolean
}): Promise<GonderimSonucu> {
  const form = new FormData()
  form.append('shipmentPackageId', String(g.paketId))
  if (g.mikro) {
    form.append('invoiceDateTime', String(g.faturaZamani))
    form.append('invoiceNumber', g.belgeNumarasi)
  }
  form.append('file', new Blob([new Uint8Array(g.pdf)], { type: 'application/pdf' }), g.dosyaAdi)

  // Content-Type'ı fetch kendisi kurar (multipart sınırı); JSON başlığı gitmez.
  const { Authorization, 'User-Agent': tarayici } = getHeaders()
  let yanit: Response
  try {
    yanit = await fetch(`${KOK}/${satici()}/seller-invoice-file`, {
      method: 'POST',
      headers: { Authorization, 'User-Agent': tarayici, Accept: 'application/json' },
      body: form,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    // Zaman aşımı: Trendyol işlemiş de olabilir; sonraki tur pakete bakar.
    return { durum: 'belirsiz', mesaj: `Trendyol yanıt vermedi (${(e as Error).name})` }
  }
  const metin = kisalt(await yanit.text().catch(() => ''))
  if (yanit.status >= 200 && yanit.status < 300) return { durum: 'tamam' }
  if (/already been sent|daha önce/i.test(metin) || yanit.status === 409) return { durum: 'zaten', mesaj: metin }
  if (yanit.status === 429 || yanit.status >= 500) return { durum: 'belirsiz', mesaj: `HTTP ${yanit.status}` }
  return { durum: 'hata', mesaj: `HTTP ${yanit.status} ${metin}`.trim() }
}
