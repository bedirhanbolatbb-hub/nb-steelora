const PRODUCT_BASE = 'https://apigw.trendyol.com/integration/product'
const INVENTORY_BASE = 'https://apigw.trendyol.com/integration/inventory'

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

export async function fetchTrendyolProducts(page = 0, size = 50) {
  const sellerId = process.env.TRENDYOL_SUPPLIER_ID
  const url = `${PRODUCT_BASE}/sellers/${sellerId}/products?approved=true&onSale=true&page=${page}&size=${size}`

  const res = await fetch(url, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Trendyol API error: ${res.status}`)
  return res.json()
}

export async function fetchAllTrendyolProducts() {
  const allProducts: any[] = []
  let page = 0
  const size = 100

  while (true) {
    const data = await fetchTrendyolProducts(page, size)
    const products = data.content || []
    allProducts.push(...products)

    if (products.length < size || page >= (data.totalPages - 1)) break
    page++
  }

  return allProducts
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
