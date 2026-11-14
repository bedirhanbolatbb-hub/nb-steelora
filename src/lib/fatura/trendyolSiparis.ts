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
const GUN_MS = 86_400_000

/** Faturası kesilecek paket durumları — BB'nin tarifi: yeni, işleme alınan, taşımada, teslim edilen. */
export const KESILECEK = new Set(['Created', 'Picking', 'Invoiced', 'Shipped', 'AtCollectionPoint', 'Delivered'])
/** İptal ya da iade: fatura açılmaz, yüklenmez. */
export const DONEN = new Set(['Cancelled', 'UnSupplied', 'Returned', 'UnDelivered'])
export const paketDurumu = (p: TrendyolPaket) => p.shipmentPackageStatus ?? p.status ?? ''

function saticiKimligi(): string {
  const satici = process.env.TRENDYOL_SUPPLIER_ID?.trim()
  if (!satici) throw new Error('TRENDYOL_SUPPLIER_ID tanımlı değil')
  return satici
}

/**
 * Son `gun` günde verilmiş tüm paketler, durumu ne olursa olsun (iptal ve
 * iadeler de gelir; ayıklama işin kendisinde). Trendyol tek sorguda en fazla
 * iki haftalık aralık kabul ediyor; varsayılan 13 gün o sınırın içinde kalır.
 */
export async function sonPaketler(gun = 13): Promise<TrendyolPaket[]> {
  const satici = saticiKimligi()
  const bitis = Date.now()
  const baslangic = bitis - gun * GUN_MS
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

/**
 * Tek siparişin paketleri, Trendyol'dan o an (yüklemeden hemen önce ve sonra
 * taze bakış). Aralık siparişin gününden başlar; Trendyol tek sorguda en çok
 * iki hafta kabul ettiği için 13 günle sınırlı.
 */
export async function siparisPaketleri(siparisNo: string, siparisZamani?: number): Promise<TrendyolPaket[]> {
  if (!/^\d{8,}$/.test(siparisNo)) throw new Error('geçersiz sipariş numarası')
  const simdi = Date.now()
  const baslangic = Number.isFinite(siparisZamani) && Number(siparisZamani) > 0
    ? Number(siparisZamani) - GUN_MS
    : simdi - 13 * GUN_MS
  const bitis = Math.min(simdi, baslangic + 13 * GUN_MS)
  const url =
    `${SIPARIS_KOKU}/${saticiKimligi()}/orders?orderNumber=${siparisNo}` +
    `&startDate=${baslangic}&endDate=${bitis}&page=0&size=50`
  const yanit = await istek(url, { headers: getHeaders(), cache: 'no-store' }, 20_000)
  if (!yanit.ok) throw new Error(`Trendyol siparişi okunamadı (HTTP ${yanit.status})`)
  const veri = await yanit.json()
  return ((veri?.content ?? []) as TrendyolPaket[]).filter((p) => String(p.orderNumber) === siparisNo)
}
