import crypto from 'crypto'

const BASE_URL = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
const API_KEY = process.env.IYZICO_API_KEY || ''
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || ''

export async function iyzicoRequest(path: string, body: object): Promise<any> {
  const randomKey = Math.random().toString(36).substring(2, 12)
  const bodyStr = JSON.stringify(body)

  // payload = randomKey + uri_path + requestBody
  const payload = randomKey + path + bodyStr

  // signature = HMAC-SHA256(payload, secretKey) → HEX
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('hex')

  // authorizationString
  const authStr = `apiKey:${API_KEY}&randomKey:${randomKey}&signature:${signature}`

  // base64 encode
  const authorization = 'IYZWSv2 ' + Buffer.from(authStr).toString('base64')

  // Faz 27: ayıklama günlükleri kaldırıldı. Bastıkları şeyler sırasıyla
  // istek gövdesinin ilk 80 karakteri (kart sahibinin adının bir kısmı),
  // HMAC imzasının ilk 80 biti, ve `authorization` ön eki — ki o ön ek
  // base64 çözüldüğünde IYZICO_API_KEY'in ilk ~23 karakterini veriyordu.
  // Yalnız hangi ucun çağrıldığı kalıyor.
  console.log('[iyzico] istek:', path)

  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'x-iyzi-rnd': randomKey,
      'x-iyzi-client-version': 'iyzipay-node-2.0.67',
    },
    body: bodyStr,
  })

  const result = await response.json()
  // Tam yanıt kart BIN'i, son dört hane, alıcı adı ve adresi taşıyor.
  // Denetimsiz bir kanala (Vercel çalışma günlüğü) akmasın; sorun gidermek
  // için gereken alanlar zaten burada.
  console.log(
    '[iyzico] yanıt:',
    JSON.stringify({
      status: result?.status,
      errorCode: result?.errorCode,
      errorGroup: result?.errorGroup,
      paymentId: result?.paymentId,
      conversationId: result?.conversationId,
    })
  )
  return result
}

export function generateConversationId(): string {
  return `nbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function initializeThreeDS(payload: object): Promise<any> {
  return iyzicoRequest('/payment/3dsecure/initialize', payload)
}

export function completeThreeDS(payload: object): Promise<any> {
  return iyzicoRequest('/payment/3dsecure/auth', payload)
}

export function retrievePaymentDetail(paymentId: string): Promise<any> {
  return iyzicoRequest('/payment/detail', {
    locale: 'tr',
    conversationId: generateConversationId(),
    paymentId,
  })
}

export function refundPaymentLine(payload: {
  paymentTransactionId: string
  price: string
  currency: string
}): Promise<any> {
  return iyzicoRequest('/payment/refund', {
    locale: 'tr',
    conversationId: generateConversationId(),
    paymentTransactionId: payload.paymentTransactionId,
    price: payload.price,
    currency: payload.currency,
    ip: '85.34.78.112',
  })
}

/** Refund every basket line returned by payment/detail (full line amounts). */
export async function refundFullPayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
  const detail = await retrievePaymentDetail(paymentId)
  if (detail.status !== 'success') {
    return { success: false, error: detail.errorMessage || 'Ödeme sorgulanamadı' }
  }
  const txs = detail.itemTransactions
  if (!Array.isArray(txs) || txs.length === 0) {
    return { success: false, error: 'Ödeme kalemi bulunamadı' }
  }
  const currency = detail.currency || 'TRY'
  for (const tx of txs) {
    const paymentTransactionId = tx.paymentTransactionId
    const paidPrice = tx.paidPrice != null ? String(tx.paidPrice) : ''
    const priceNum = parseFloat(paidPrice)
    if (!paymentTransactionId || !paidPrice || Number.isNaN(priceNum) || priceNum <= 0) continue
    const ref = await refundPaymentLine({
      paymentTransactionId,
      price: paidPrice,
      currency,
    })
    if (ref.status !== 'success') {
      return { success: false, error: ref.errorMessage || 'İade başarısız' }
    }
  }
  return { success: true }
}
