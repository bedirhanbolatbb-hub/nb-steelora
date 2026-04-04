import crypto from 'crypto'

const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
const API_KEY = process.env.IYZICO_API_KEY || ''
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || ''

function generateAuthContent(randomString: string, body: string): string {
  const hashInput = API_KEY + randomString + SECRET_KEY + body
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(hashInput)
    .digest('base64')

  // iyzipay kaynak formatı: base64(apiKey + ":" + randomString + ":" + hmacBase64)
  const token = API_KEY + ':' + randomString + ':' + signature
  const authHeader = 'IYZWSv2 ' + Buffer.from(token).toString('base64')

  console.log('[iyzico] API_KEY prefix:', API_KEY.substring(0, 8))
  console.log('[iyzico] token (pre-b64):', token.substring(0, 60))
  console.log('[iyzico] decoded check:', Buffer.from(authHeader.replace('IYZWSv2 ', ''), 'base64').toString('utf8').substring(0, 60))

  return authHeader
}

export async function iyzicoRequest(path: string, body: object): Promise<any> {
  const randomString = Math.random().toString(36).substring(2, 12)
  const bodyStr = JSON.stringify(body)
  const authContent = generateAuthContent(randomString, bodyStr)

  console.log('[iyzico] request path:', path)
  console.log('[iyzico] request body:', bodyStr)

  const response = await fetch(`${IYZICO_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authContent,
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
