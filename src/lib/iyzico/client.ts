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

  console.log('[iyzico] path:', path)
  console.log('[iyzico] payload prefix:', payload.substring(0, 80))
  console.log('[iyzico] signature (hex):', signature.substring(0, 20))
  console.log('[iyzico] authorization prefix:', authorization.substring(0, 40))

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
  console.log('[iyzico] response:', JSON.stringify(result))
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
