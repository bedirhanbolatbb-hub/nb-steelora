// iyzipay SDK — signature otomatik hesaplanır
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require('iyzipay')

function getIyzipay() {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com',
  })
}

export function generateConversationId(): string {
  return `nbs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function initializeThreeDS(request: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const iyzipay = getIyzipay()
    console.log('[iyzico] threedsInitialize.create payload:', JSON.stringify(request, null, 2))
    iyzipay.threedsInitialize.create(request, (err: any, result: any) => {
      console.log('[iyzico] threedsInitialize error:', err)
      console.log('[iyzico] threedsInitialize result:', JSON.stringify(result, null, 2))
      if (err) return reject(err)
      resolve(result)
    })
  })
}

export function completeThreeDS(request: Record<string, any>): Promise<any> {
  return new Promise((resolve, reject) => {
    const iyzipay = getIyzipay()
    iyzipay.threedsPayment.create(request, (err: any, result: any) => {
      if (err) return reject(err)
      resolve(result)
    })
  })
}
