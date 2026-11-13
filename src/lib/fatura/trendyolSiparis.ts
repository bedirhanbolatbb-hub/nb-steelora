/**
 * Trendyol sipariş paketleri — fatura işi için salt okuma.
 *
 * Kimlik bilgisi ürün senkronuyla aynı (TRENDYOL_SUPPLIER_ID / API_KEY /
 * API_SECRET); başlık ve 429 yeniden denemesi tek kaynaktan, trendyol/client.
 * Bu modül Trendyol'a HİÇBİR şey yazmaz.
 */
import { getHeaders, istek } from '@/lib/trendyol/client'
import type { TrendyolPaket } from './taslak'

const SIPARIS_KOKU = 'https://apigw.trendyol.com/integration/order/sellers'
const SAYFA_BOYU = 200
const EN_FAZLA_SAYFA = 10

/**
 * Son `gun` günde verilmiş tüm paketler, durumu ne olursa olsun (iptal ve
 * iadeler de gelir; ayıklama işin kendisinde). Trendyol tek sorguda en fazla
 * iki haftalık aralık kabul ediyor; varsayılan 13 gün o sınırın içinde kalır.
 */
export async function sonPaketler(gun = 13): Promise<TrendyolPaket[]> {
  const satici = process.env.TRENDYOL_SUPPLIER_ID?.trim()
  if (!satici) throw new Error('TRENDYOL_SUPPLIER_ID tanımlı değil')

  const bitis = Date.now()
  const baslangic = bitis - gun * 86_400_000
  const paketler: TrendyolPaket[] = []
  for (let sayfa = 0; sayfa < EN_FAZLA_SAYFA; sayfa++) {
    const url =
      `${SIPARIS_KOKU}/${satici}/orders?startDate=${baslangic}&endDate=${bitis}` +
      `&page=${sayfa}&size=${SAYFA_BOYU}`
    const yanit = await istek(url, { headers: getHeaders(), cache: 'no-store' }, 20_000)
    if (!yanit.ok) throw new Error(`Trendyol siparişleri alınamadı (HTTP ${yanit.status})`)
    const veri = await yanit.json()
    paketler.push(...((veri?.content ?? []) as TrendyolPaket[]))
    if (sayfa + 1 >= Number(veri?.totalPages ?? 1)) break
  }
  return paketler
}
