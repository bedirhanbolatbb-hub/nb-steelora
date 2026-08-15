import { KargonomiProvider } from './kargonomi'
import { MockProvider } from './mock'
import type { CarrierProvider } from './types'

export * from './types'

/**
 * Aktif taşıyıcı sağlayıcısı.
 *
 * CARRIER_PROVIDER=kargonomi + KARGONOMI_TOKEN varsa gerçek adaptör, aksi
 * hâlde mock. Token gelince yapılacak TEK iş: Vercel'de CARRIER_PROVIDER ve
 * KARGONOMI_* değişkenlerini tanımlamak — kod değişmez.
 */
export function getCarrierProvider(slug?: string): CarrierProvider {
  const secim = (slug || process.env.CARRIER_PROVIDER || 'mock').toLowerCase()
  if (secim === 'kargonomi') {
    const p = new KargonomiProvider()
    // Token yoksa gerçek adaptörle çağrı yapmak yerine mock'a düşmek yerine
    // sağlayıcıyı olduğu gibi döneriz: panel `hazir=false` görüp düğmeleri
    // pasifleştirir, sessizce yanlış sağlayıcıya geçilmez.
    return p
  }
  return new MockProvider()
}

/** Webhook yolundaki /[provider] parçası için — bilinmeyen slug null. */
export function getProviderBySlug(slug: string): CarrierProvider | null {
  if (slug === 'kargonomi') return new KargonomiProvider()
  if (slug === 'mock') return new MockProvider()
  return null
}
