const BASE_URL = 'https://api.trendyol.com/sapigw'

function getHeaders() {
  const credentials = Buffer.from(
    `${process.env.TRENDYOL_API_KEY}:${process.env.TRENDYOL_API_SECRET}`
  ).toString('base64')

  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'User-Agent': `${process.env.TRENDYOL_SUPPLIER_ID} - SelfIntegration`,
  }
}

export async function fetchTrendyolProducts(page = 0, size = 50) {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID
  const url = `${BASE_URL}/suppliers/${supplierId}/products?page=${page}&size=${size}&approved=true`

  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) throw new Error(`Trendyol API error: ${res.status}`)
  return res.json()
}

export async function fetchAllTrendyolProducts() {
  const allProducts: any[] = []
  let page = 0
  const size = 50

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
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID
  const url = `${BASE_URL}/suppliers/${supplierId}/products/price-and-inventory`

  const body = {
    items: [{ barcode, quantity }],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Trendyol stock update error: ${res.status} - ${err}`)
  }

  return res.json()
}
