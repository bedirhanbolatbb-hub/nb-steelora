// Trendyol Ürün V2 servisleri.
// V1 ürün servisleri kapandı; ürün çekme uçları V2'ye taşındı (10 Ağu 2026).
// Stok/fiyat güncelleme ucu (updatePriceAndInventory) V1-V2 ORTAK, değişmedi.
//
// 15 EKİM 2026 — SİPARİŞ UCU KAPANIŞI BİZİ ETKİLEMEZ: kapanan uç
// `/integration/order/sellers/{id}/orders`; bu proje Trendyol'dan sipariş
// ÇEKMEZ (siparişler kendi sitemizden, iyzico ile gelir). Aşağıdaki iki taban
// adres, kullandığımız uçların tamamıdır.
const PRODUCT_BASE = 'https://apigw.trendyol.com/integration/product'
const INVENTORY_BASE = 'https://apigw.trendyol.com/integration/inventory'

// inventory-and-price ucu tek çağrıda en fazla 50 barkod kabul ediyor.
export const BARCODE_QUERY_LIMIT = 50

/** 429'da bekleyip yeniden denenecek tur sayısı (ilk deneme hariç). */
const YENIDEN_DENEME = 3

function getHeaders() {
  const credentials = Buffer.from(
    `${process.env.TRENDYOL_API_KEY}:${process.env.TRENDYOL_API_SECRET}`
  ).toString('base64')

  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Trendyol'un ZORUNLU biçimi: "{satıcı kimliği} - {entegratör}". Kendi
    // yazdığımız entegrasyonda entegratör adı "SelfIntegration" olmalı ve
    // alfanümerik + en çok 30 karakter olmalı.
    // Eskiden "KarPanel - nbsteelora@gmail.com" gidiyordu: satıcı kimliğiyle
    // başlamıyordu, başka bir ürünün adını taşıyordu ve markanın e-posta
    // adresini her isteğin başlığında dışarı veriyordu. Trendyol şimdilik
    // kabul ediyor, ama biçim denetimi başladığı gün senkron durur.
    'User-Agent': `${process.env.TRENDYOL_SUPPLIER_ID} - SelfIntegration`,
  }
}

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 429 (hız sınırı) durumunda bekleyip yeniden dener.
 *
 * 14 Eylül 2026'dan itibaren ürün servislerinde satıcının listeleme kotasına
 * bağlı dakikalık istek sınırı var (en düşük basamak: okuma 1000/dk).
 * Ölçtük: gecelik senkron 8 saniyede ~27 istek yapıyor, yani ~200/dk — sınırın
 * beşte biri. Yine de tek bir 429 bütün koşuyu düşürmesin diye ağ var:
 * Retry-After başlığı varsa ona, yoksa artan beklemeye uyar.
 */
async function istek(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  for (let tur = 0; ; tur++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    if (res.status !== 429 || tur >= YENIDEN_DENEME) return res

    const basliktan = Number(res.headers.get('Retry-After'))
    const saniye = Number.isFinite(basliktan) && basliktan > 0 ? basliktan : 2 ** tur * 2
    console.warn(`[trendyol] 429 — ${saniye} sn beklenip yeniden denenecek (tur ${tur + 1}/${YENIDEN_DENEME})`)
    await bekle(Math.min(saniye, 30) * 1000)
  }
}

async function getJson(url: string, timeoutMs = 20_000) {
  const res = await istek(url, { headers: getHeaders() }, timeoutMs)
  if (!res.ok) throw new Error(`Trendyol API error: ${res.status}`)
  return res.json()
}

/**
 * V2 "Ürün Filtreleme - Onaylı Ürün".
 * Content bazlı döner: her content altında variants dizisi var.
 * status=onSale, V1'deki approved=true&onSale=true filtresinin karşılığı.
 */
export async function fetchApprovedProducts(page = 0, size = 100) {
  const sellerId = process.env.TRENDYOL_SUPPLIER_ID
  return getJson(
    `${PRODUCT_BASE}/sellers/${sellerId}/products/approved?status=onSale&page=${page}&size=${size}`
  )
}

/**
 * V2 "Onaylı Ürün Stok ve Fiyat" — quantity/salePrice yalnızca bu uçta dönüyor,
 * onaylı ürün listesinde stok adedi yer almıyor.
 */
export async function fetchInventoryAndPrice(barcodes: string[]) {
  const sellerId = process.env.TRENDYOL_SUPPLIER_ID
  const query = barcodes.slice(0, BARCODE_QUERY_LIMIT).join(',')
  return getJson(
    `${PRODUCT_BASE}/sellers/${sellerId}/products/approved/inventory-and-price?barcodes=${encodeURIComponent(query)}&size=${BARCODE_QUERY_LIMIT}`
  )
}

/** Barkod → { quantity, salePrice } eşlemesi (50'lik parçalar hâlinde sorgulanır). */
export async function fetchStockAndPriceMap(
  barcodes: string[]
): Promise<Map<string, { quantity: number; salePrice: number }>> {
  const map = new Map<string, { quantity: number; salePrice: number }>()

  for (let i = 0; i < barcodes.length; i += BARCODE_QUERY_LIMIT) {
    const chunk = barcodes.slice(i, i + BARCODE_QUERY_LIMIT)
    const data = await fetchInventoryAndPrice(chunk)

    for (const content of data.content || []) {
      for (const variant of content.variants || []) {
        if (!variant.barcode) continue
        if (typeof variant.quantity !== 'number' || typeof variant.salePrice !== 'number') continue
        map.set(variant.barcode, { quantity: variant.quantity, salePrice: variant.salePrice })
      }
    }
  }

  return map
}

export async function updateTrendyolStock(barcode: string, quantity: number) {
  const sellerId = process.env.TRENDYOL_SUPPLIER_ID
  const url = `${INVENTORY_BASE}/sellers/${sellerId}/products/price-and-inventory`

  const body = {
    items: [{ barcode, quantity }],
  }

  const res = await istek(
    url,
    { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) },
    10_000
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Trendyol stock update error: ${res.status} - ${err}`)
  }

  return res.json()
}
