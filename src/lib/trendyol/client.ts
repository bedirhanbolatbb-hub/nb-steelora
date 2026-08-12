// Trendyol Ürün V2 servisleri.
// V1 ürün servisleri 15 Eylül 2026'da kapanıyor; ürün çekme uçları V2'ye taşındı.
// Stok/fiyat güncelleme ucu (updatePriceAndInventory) V1-V2 ortak, değişmedi.
const PRODUCT_BASE = 'https://apigw.trendyol.com/integration/product'
const INVENTORY_BASE = 'https://apigw.trendyol.com/integration/inventory'

// inventory-and-price ucu tek çağrıda en fazla 50 barkod kabul ediyor.
export const BARCODE_QUERY_LIMIT = 50

function getHeaders() {
  const credentials = Buffer.from(
    `${process.env.TRENDYOL_API_KEY}:${process.env.TRENDYOL_API_SECRET}`
  ).toString('base64')

  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'KarPanel - nbsteelora@gmail.com',
  }
}

async function getJson(url: string, timeoutMs = 20_000) {
  const res = await fetch(url, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(timeoutMs),
  })
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

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Trendyol stock update error: ${res.status} - ${err}`)
  }

  return res.json()
}
