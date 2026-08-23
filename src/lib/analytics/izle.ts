/**
 * Ölçüm çağrısının ince kapısı (Faz 12 cilası).
 *
 * Gönderim kodu (lib/analytics/client) artık ilk yük zincirinde değil: sepet,
 * favori, arama ve ödeme akışları bu kapıyı çağırır, gerçek modül ancak olay
 * gerçekten olduğunda indirilir. Ölçüm noktaları aynen korunur.
 */

// Tek kaynak: lib/analytics/track.ts → ISTEMCI_OLAYLARI
import type { IstemciOlayi as Olay } from './track'

type Yuk = {
  productId?: string | null
  collectionSlug?: string | null
  searchQuery?: string | null
  value?: number | null
  meta?: Record<string, unknown>
}

export function izle(event: Olay, yuk: Yuk = {}): void {
  if (typeof window === 'undefined') return
  // Ateşle-unut: modül indirilemezse bile kullanıcı akışı etkilenmez.
  void import('./client')
    .then((m) => m.izle(event, yuk))
    .catch(() => {})
}
