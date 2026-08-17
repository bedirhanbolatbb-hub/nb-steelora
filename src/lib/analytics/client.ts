/**
 * İstemci olay göndericisi (Faz 12).
 *
 * Ateşle-unut: sayfayı asla yavaşlatmaz, hata sessizce yutulur.
 * `sendBeacon` varsa onu kullanır (sayfa terk edilse bile ulaşır), yoksa
 * keepalive'lı fetch'e düşer. Oturum kimliği GÖNDERİLMEZ — sunucuda çerezsiz
 * türetilir; istemci kendi kimliğini uyduramaz.
 */

type Olay =
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'favorite_add'
  | 'favorite_remove'
  | 'search'
  | 'begin_checkout'
  | 'newsletter_signup'

export type OlayYuku = {
  productId?: string | null
  collectionSlug?: string | null
  searchQuery?: string | null
  value?: number | null
  meta?: Record<string, unknown>
}

export function izle(event: Olay, yuk: OlayYuku = {}): void {
  if (typeof window === 'undefined') return
  try {
    const govde = JSON.stringify({
      event,
      path: window.location.pathname,
      ...yuk,
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', new Blob([govde], { type: 'application/json' }))
      return
    }

    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: govde,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Ölçüm hiçbir koşulda kullanıcı akışını bozmaz.
  }
}
