import crypto from 'crypto'

const API_KEY = () => process.env.IYZICO_API_KEY!
const SECRET_KEY = () => process.env.IYZICO_SECRET_KEY!
const BASE_URL = () => process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'

function generateAuthorizationHeader(body: string): { authorization: string; randomString: string } {
  const randomString = Math.random().toString(36).substring(2, 14)
  const hashStr = API_KEY() + randomString + SECRET_KEY() + body
  const signature = crypto.createHmac('sha256', SECRET_KEY()).update(hashStr).digest('base64')
  const authorization = `IYZWSv2 apiKey:${API_KEY()}, randomKey:${randomString}, signature:${signature}`
  return { authorization, randomString }
}

async function iyzicoRequest(path: string, body: Record<string, any>) {
  const bodyStr = JSON.stringify(body)
  const { authorization, randomString } = generateAuthorizationHeader(bodyStr)

  const res = await fetch(`${BASE_URL()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
      'x-iyzi-rnd': randomString,
    },
    body: bodyStr,
  })

  return res.json()
}

export function generateConversationId(): string {
  return `nbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export async function initializeThreeDS(params: Record<string, any>) {
  return iyzicoRequest('/payment/3dsecure/initialize', params)
}

export async function completeThreeDS(params: Record<string, any>) {
  return iyzicoRequest('/payment/3dsecure/auth', params)
}
